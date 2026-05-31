import { db } from '../db/db';
import { syncQueue, type SyncJob, type NewSyncJob } from '../db/schema';
import { eq, inArray, asc, and } from 'drizzle-orm';
import { FrameworkSyncEngine, SyncStorageAdapter } from '../../framework/sync';

class DrizzleSyncStorageAdapter implements SyncStorageAdapter<SyncJob> {
  async insertJob(job: Omit<SyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<SyncJob> {
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
    return inserted as SyncJob;
  }

  async updateJobStatus(id: number, status: SyncJob['status'], attempts?: number): Promise<void> {
    const updates: any = { status };
    if (attempts !== undefined) {
      updates.attempts = attempts;
    }
    await db.update(syncQueue).set(updates).where(eq(syncQueue.id, id));
  }

  async updateJob(id: number, updates: Partial<Omit<SyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>>): Promise<void> {
    await db.update(syncQueue).set(updates as any).where(eq(syncQueue.id, id));
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(syncQueue).where(eq(syncQueue.id, id));
  }

  async getReadyJobs(supportedJobTypes?: string[]): Promise<SyncJob[]> {
    const baseWhere = inArray(syncQueue.status, ['pending', 'failed']);
    const whereClause = supportedJobTypes
      ? and(baseWhere, inArray(syncQueue.jobType, supportedJobTypes))
      : baseWhere;

    return (await db
      .select()
      .from(syncQueue)
      .where(whereClause)
      .orderBy(asc(syncQueue.id))) as SyncJob[];
  }

  async getBlockedEntityIds(supportedJobTypes?: string[]): Promise<Set<string>> {
    const blockedBaseWhere = inArray(syncQueue.status, ['quarantined', 'processing']);
    const blockedWhereClause = supportedJobTypes
      ? and(blockedBaseWhere, inArray(syncQueue.jobType, supportedJobTypes))
      : blockedBaseWhere;

    const blockedJobs = await db
      .select({ entityId: syncQueue.entityId })
      .from(syncQueue)
      .where(blockedWhereClause);

    const blockedEntityIds = new Set<string>();
    for (const bj of blockedJobs) {
      if (bj.entityId) {
        blockedEntityIds.add(bj.entityId);
      }
    }
    return blockedEntityIds;
  }

  async resetJobsStatus(fromStatus: SyncJob['status'], toStatus: SyncJob['status'], supportedJobTypes?: string[], resetAttempts?: boolean): Promise<void> {
    const whereClause = supportedJobTypes
      ? and(eq(syncQueue.status, fromStatus), inArray(syncQueue.jobType, supportedJobTypes))
      : eq(syncQueue.status, fromStatus);

    const updates: any = { status: toStatus };
    if (resetAttempts) {
      updates.attempts = 0;
    }

    await db.update(syncQueue).set(updates).where(whereClause);
  }

  async getQueueStatus(supportedJobTypes?: string[]) {
    const whereClause = supportedJobTypes
      ? inArray(syncQueue.jobType, supportedJobTypes)
      : undefined;

    const jobs = await (whereClause
      ? db.select().from(syncQueue).where(whereClause)
      : db.select().from(syncQueue)) as SyncJob[];

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

export const defaultStorageAdapter = new DrizzleSyncStorageAdapter();

/**
 * Abstract SyncEngine for local-first database operations outbox.
 * Manages FIFO queue processing, concurrent serialization by entity, and poison-pill quarantine.
 */
export abstract class SyncEngine extends FrameworkSyncEngine<SyncJob> {
  constructor() {
    super(defaultStorageAdapter);
  }

  // queueJob must be compatible with existing calls
  public async queueJob(
    job: Omit<NewSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<SyncJob> {
    return super.queueJob(job as any);
  }
}
