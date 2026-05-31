import { db } from '../db/db';
import { syncQueue, type SyncJob, type NewSyncJob } from '../db/schema';
import { eq, inArray, asc, and } from 'drizzle-orm';

/**
 * Abstract SyncEngine for local-first database operations outbox.
 * Manages FIFO queue processing, concurrent serialization by entity, and poison-pill quarantine.
 */
export abstract class SyncEngine {
  private activeEntityIds = new Set<string>();
  private isProcessing = false;
  private needsPush = false;
  protected maxAttempts = 3;
  protected supportedJobTypes?: string[];

  /**
   * Dispatch a single job to the remote server/API.
   * Subclasses must implement this to define the actual sync mutation.
   */
  protected abstract dispatchJob(job: SyncJob): Promise<void>;

  /**
   * Lifecycle hook called after a job has successfully completed.
   */
  protected onJobSuccess(job: SyncJob): Promise<void> | void {}

  /**
   * Lifecycle hook called when a job execution fails but will be retried.
   */
  protected onJobFailure(job: SyncJob, error: any): Promise<void> | void {}

  /**
   * Lifecycle hook called when a job has failed maxAttempts times and is moved to quarantined.
   */
  protected onJobQuarantined(job: SyncJob, error: any): Promise<void> | void {}

  /**
   * Adds a new mutation job to the outbox queue and triggers background processing.
   */
  public async queueJob(
    job: Omit<NewSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<SyncJob> {
    const [inserted] = await db
      .insert(syncQueue)
      .values({
        jobType: job.jobType,
        payload: job.payload,
        entityId: job.entityId ?? null,
        status: 'pending',
        attempts: 0,
      })
      .returning();

    // Trigger push in background asynchronously
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error in background pushChanges:', err);
    });

    return inserted;
  }

  /**
   * Processes pending and failed jobs in the outbox sequentially, preserving
   * order of execution and serializing transactions targeting the same entityId.
   */
  public async pushChanges(): Promise<void> {
    if (this.isProcessing) {
      this.needsPush = true;
      return;
    }
    this.isProcessing = true;
    this.needsPush = false;

    try {
      while (true) {
        // Fetch all jobs that are ready to run
        const baseWhere = inArray(syncQueue.status, ['pending', 'failed']);
        const whereClause = this.supportedJobTypes
          ? and(baseWhere, inArray(syncQueue.jobType, this.supportedJobTypes))
          : baseWhere;

        const jobs = await db
          .select()
          .from(syncQueue)
          .where(whereClause)
          .orderBy(asc(syncQueue.id));

        if (jobs.length === 0) {
          break;
        }

        // Identify entityIds that have quarantined or processing jobs to avoid out-of-order execution
        const blockedEntityIds = new Set<string>();
        const blockedBaseWhere = inArray(syncQueue.status, ['quarantined', 'processing']);
        const blockedWhereClause = this.supportedJobTypes
          ? and(blockedBaseWhere, inArray(syncQueue.jobType, this.supportedJobTypes))
          : blockedBaseWhere;

        const blockedJobs = await db
          .select({ entityId: syncQueue.entityId })
          .from(syncQueue)
          .where(blockedWhereClause);

        for (const bj of blockedJobs) {
          if (bj.entityId) {
            blockedEntityIds.add(bj.entityId);
          }
        }

        // Find the first job that is not locked by concurrency serialization or a quarantined/processing predecessor
        const nextJob = jobs.find((job) => {
          if (!job.entityId) return true;
          return !this.activeEntityIds.has(job.entityId) && !blockedEntityIds.has(job.entityId);
        });

        // If all remaining jobs are blocked by active entity operations or quarantined predecessors, stop loop
        if (!nextJob) {
          break;
        }

        // Lock the entityId
        if (nextJob.entityId) {
          this.activeEntityIds.add(nextJob.entityId);
        }

        try {
          // Set status to processing
          await db
            .update(syncQueue)
            .set({ status: 'processing' })
            .where(eq(syncQueue.id, nextJob.id));

          // Run the subclass dispatcher implementation
          await this.dispatchJob({ ...nextJob, status: 'processing' });

          // Upon success, delete the sync record to clean the outbox database
          await db.delete(syncQueue).where(eq(syncQueue.id, nextJob.id));

          try {
            await this.onJobSuccess(nextJob);
          } catch (hookError) {
            console.error('[SyncEngine] Error in onJobSuccess hook:', hookError);
          }
        } catch (error: any) {
          const updatedAttempts = nextJob.attempts + 1;
          const isQuarantined = updatedAttempts >= this.maxAttempts;
          const newStatus = isQuarantined ? 'quarantined' : 'failed';

          await db
            .update(syncQueue)
            .set({
              status: newStatus,
              attempts: updatedAttempts,
            })
            .where(eq(syncQueue.id, nextJob.id));

          const updatedJob: SyncJob = {
            ...nextJob,
            status: newStatus,
            attempts: updatedAttempts,
          };

          if (isQuarantined) {
            try {
              await this.onJobQuarantined(updatedJob, error);
            } catch (hookError) {
              console.error('[SyncEngine] Error in onJobQuarantined hook:', hookError);
            }
          } else {
            try {
              await this.onJobFailure(updatedJob, error);
            } catch (hookError) {
              console.error('[SyncEngine] Error in onJobFailure hook:', hookError);
            }
          }
        } finally {
          // Release the concurrency lock on this entityId
          if (nextJob.entityId) {
            this.activeEntityIds.delete(nextJob.entityId);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.needsPush) {
        this.pushChanges().catch((err) => {
          console.error('[SyncEngine] Error in re-triggered background pushChanges:', err);
        });
      }
    }
  }

  /**
   * Resets quarantined jobs back to pending to enable retrying execution manually.
   */
  public async retryQuarantined(): Promise<void> {
    const whereClause = this.supportedJobTypes
      ? and(eq(syncQueue.status, 'quarantined'), inArray(syncQueue.jobType, this.supportedJobTypes))
      : eq(syncQueue.status, 'quarantined');

    await db
      .update(syncQueue)
      .set({ status: 'pending', attempts: 0 })
      .where(whereClause);

    // Trigger push processing
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error triggering push after retryQuarantined:', err);
    });
  }

  /**
   * Resets any jobs stuck in 'processing' status back to 'failed'
   * to ensure they are retried after an unexpected app crash or termination.
   */
  public async recoverStuckJobs(): Promise<void> {
    const whereClause = this.supportedJobTypes
      ? and(eq(syncQueue.status, 'processing'), inArray(syncQueue.jobType, this.supportedJobTypes))
      : eq(syncQueue.status, 'processing');

    await db
      .update(syncQueue)
      .set({ status: 'failed' })
      .where(whereClause);

    // Trigger push processing
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error triggering push after recoverStuckJobs:', err);
    });
  }

  /**
   * Queries and returns a telemetry status report of the outbox.
   */
  public async getQueueStatus() {
    const whereClause = this.supportedJobTypes
      ? inArray(syncQueue.jobType, this.supportedJobTypes)
      : undefined;

    const jobs = await (whereClause
      ? db.select().from(syncQueue).where(whereClause)
      : db.select().from(syncQueue));

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      quarantined: jobs.filter((j) => j.status === 'quarantined').length,
      jobs,
    };
  }
}
