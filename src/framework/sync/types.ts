export interface SyncJobBase {
  id: string | number;
  jobType: string;
  payload: string;
  status: 'pending' | 'processing' | 'failed' | 'quarantined';
  attempts: number;
  entityId: string | null;
  createdAt: Date;
}

export interface SyncStorageAdapter<TJob extends SyncJobBase> {
  insertJob(job: Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<TJob>;
  updateJobStatus(id: TJob['id'], status: TJob['status'], attempts?: number): Promise<void>;
  deleteJob(id: TJob['id']): Promise<void>;
  getReadyJobs(supportedJobTypes?: string[]): Promise<TJob[]>;
  getBlockedEntityIds(supportedJobTypes?: string[]): Promise<Set<string>>;
  resetJobsStatus(fromStatus: TJob['status'], toStatus: TJob['status'], supportedJobTypes?: string[], resetAttempts?: boolean): Promise<void>;
  getQueueStatus(supportedJobTypes?: string[]): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
    quarantined: number;
    jobs: TJob[];
  }>;
}

export interface OutboxDelta {
  subject: string;
  predicate: string;
  object: string;
  timestamp: number;
}

export interface OutboxHook {
  receipts?: boolean;
}

export interface OutboxReceipt {
  inputHash: string;
  outputHash: string;
  deltaHash: string;
  previousReceiptHash: string;
  receiptHash: string;
}
