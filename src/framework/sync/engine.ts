import { SyncJobBase, SyncStorageAdapter } from './types';

export abstract class FrameworkSyncEngine<TJob extends SyncJobBase> {
  private activeEntityIds = new Set<string>();
  private isProcessing = false;
  private needsPush = false;
  
  protected maxAttempts = 3;
  protected supportedJobTypes?: string[];

  constructor(protected storage: SyncStorageAdapter<TJob>) {}

  /**
   * Dispatch a single job to the remote server/API.
   * Subclasses must implement this to define the actual sync mutation.
   */
  protected abstract dispatchJob(job: TJob): Promise<void>;

  protected onJobSuccess(job: TJob): Promise<void> | void {}
  protected onJobFailure(job: TJob, error: any): Promise<void> | void {}
  protected onJobQuarantined(job: TJob, error: any): Promise<void> | void {}

  public async queueJob(
    job: Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<TJob> {
    const inserted = await this.storage.insertJob(job);
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error in background pushChanges:', err);
    });
    return inserted;
  }

  public async pushChanges(): Promise<void> {
    if (this.isProcessing) {
      this.needsPush = true;
      return;
    }
    this.isProcessing = true;
    this.needsPush = false;

    try {
      while (true) {
        const jobs = await this.storage.getReadyJobs(this.supportedJobTypes);
        if (jobs.length === 0) break;

        const blockedEntityIds = await this.storage.getBlockedEntityIds(this.supportedJobTypes);

        const nextJob = jobs.find((job) => {
          if (!job.entityId) return true;
          return !this.activeEntityIds.has(job.entityId) && !blockedEntityIds.has(job.entityId);
        });

        if (!nextJob) break;

        if (nextJob.entityId) {
          this.activeEntityIds.add(nextJob.entityId);
        }

        try {
          await this.storage.updateJobStatus(nextJob.id, 'processing');
          await this.dispatchJob({ ...nextJob, status: 'processing' } as unknown as TJob);
          await this.storage.deleteJob(nextJob.id);

          try {
            await this.onJobSuccess(nextJob);
          } catch (hookError) {
            console.error('[SyncEngine] Error in onJobSuccess hook:', hookError);
          }
        } catch (error: any) {
          const updatedAttempts = nextJob.attempts + 1;
          const isQuarantined = updatedAttempts >= this.maxAttempts;
          const newStatus = isQuarantined ? 'quarantined' : 'failed';

          await this.storage.updateJobStatus(nextJob.id, newStatus, updatedAttempts);

          const updatedJob = {
            ...nextJob,
            status: newStatus,
            attempts: updatedAttempts,
          } as unknown as TJob;

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

  public async retryQuarantined(): Promise<void> {
    await this.storage.resetJobsStatus('quarantined', 'pending', this.supportedJobTypes, true);
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error triggering push after retryQuarantined:', err);
    });
  }

  public async recoverStuckJobs(): Promise<void> {
    await this.storage.resetJobsStatus('processing', 'failed', this.supportedJobTypes, false);
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error triggering push after recoverStuckJobs:', err);
    });
  }

  public async getQueueStatus() {
    return this.storage.getQueueStatus(this.supportedJobTypes);
  }
}
