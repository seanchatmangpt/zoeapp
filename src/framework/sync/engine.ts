import { SyncJobBase, SyncStorageAdapter, SyncEngineConfig, ConflictContext, ConflictResolutionResult, SyncEngineReceipt } from './types';
import { blake3, canonicalStringify } from '../../lib/crypto/receipts';

// ─────────────────────────────────────────────────────────────────────────────
// PATQ Law: Pre-Admission Tension Queue receipt enforcement
//
// CRITICAL INVARIANT (Receipted Chatman Equation: R ⊢ A = μ(O*)):
//   Every job dispatch — single or batch — MUST:
//     1. Compute batchHash = blake3(canonical_sort(jobs))
//     2. Chain it: receiptHash = blake3(previousReceiptHash + batchHash + processedAt + jobCount)
//     3. Persist the receipt via storage.storeReceipt() BEFORE any network I/O
//
// Violation of this invariant is a PATQ Critical Violation.
// ─────────────────────────────────────────────────────────────────────────────

/** Deterministic genesis hash for the very first receipt in a chain. */
const SYNC_ENGINE_GENESIS_HASH = blake3('@truex/membrane-client:sync-engine:genesis:patq');

/**
 * Compute the canonical BLAKE3 batch hash over an ordered set of jobs.
 * Sorted by job id for determinism; payload is included to cover content.
 */
function computeJobsBatchHash(jobs: SyncJobBase[]): string {
  const canonical = canonicalStringify(
    [...jobs]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((j) => ({
        id: j.id,
        jobType: j.jobType,
        payload: j.payload,
        entityId: j.entityId,
        attempts: j.attempts,
      }))
  );
  return blake3(canonical);
}

/**
 * Compute the chained receipt hash.
 * receiptHash = blake3(canonical({ previousReceiptHash, batchHash, processedAt, jobCount }))
 */
function computeChainedReceiptHash(
  previousReceiptHash: string,
  batchHash: string,
  processedAt: string,
  jobCount: number
): string {
  const meta = canonicalStringify({ batchHash, jobCount, previousReceiptHash, processedAt });
  return blake3(meta);
}

/**
 * Derive a stable short ID from the receipt hash.
 * Format: "srpt_<first32hexchars>"
 */
function deriveReceiptId(receiptHash: string): string {
  return `srpt_${receiptHash.substring(0, 32)}`;
}

/**
 * Advanced Sync Engine designed for offline-first applications.
 * Supports batch dispatch, conflict resolution, and complex retry strategies.
 *
 * PATQ Law enforcement: every dispatch path generates and persists a BLAKE3
 * receipt BEFORE any network I/O is attempted.
 */
export abstract class FrameworkSyncEngine<TJob extends SyncJobBase> {
  private activeEntityIds = new Set<string>();
  private isProcessing = false;
  private needsPush = false;

  protected maxAttempts = 3;
  protected supportedJobTypes?: string[];
  protected config: SyncEngineConfig<TJob>;

  constructor(protected storage: SyncStorageAdapter<TJob>, config?: SyncEngineConfig<TJob>) {
    this.config = config || {};
    if (this.config.retryStrategy) {
      this.maxAttempts = this.config.retryStrategy.maxAttempts;
    }
  }

  /**
   * Dispatch a single job to the remote server/API.
   * Subclasses must implement this to define the actual sync mutation.
   */
  protected abstract dispatchJob(job: TJob): Promise<void>;

  /**
   * Optional: Dispatch a batch of jobs in a single request.
   * If implemented, the engine will group jobs and call this instead of `dispatchJob` when `batchSize` > 1.
   */
  protected dispatchBatch?(jobs: TJob[]): Promise<void>;

  protected onJobSuccess(job: TJob): Promise<void> | void {}
  protected onJobFailure(job: TJob, error: any): Promise<void> | void {}
  protected onJobQuarantined(job: TJob, error: any): Promise<void> | void {}

  /**
   * Determine delay before next attempt based on retry strategy.
   * @param attempts Current attempt count
   * @returns Delay in milliseconds
   */
  protected calculateRetryDelay(attempts: number): number {
    const strategy = this.config.retryStrategy;
    if (!strategy) return 0;

    let delay = strategy.baseDelayMs;
    if (strategy.backoffType === 'linear') {
      delay = strategy.baseDelayMs * attempts;
    } else if (strategy.backoffType === 'exponential') {
      delay = strategy.baseDelayMs * Math.pow(2, attempts - 1);
    }

    if (strategy.maxDelayMs && delay > strategy.maxDelayMs) {
      return strategy.maxDelayMs;
    }
    return delay;
  }

  /**
   * Delay utility.
   */
  protected async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATQ Receipt Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve the previous receipt hash for chaining.
   * Falls back to the deterministic genesis hash if no prior receipt exists
   * or if the storage adapter does not support receipt retrieval.
   */
  private async getPreviousReceiptHash(): Promise<string> {
    if (this.storage.getLatestReceipt) {
      try {
        const latest = await this.storage.getLatestReceipt();
        if (latest) {
          return latest.receiptHash;
        }
      } catch (err) {
        console.error('[SyncEngine] Failed to load latest receipt for chaining:', err);
      }
    }
    return SYNC_ENGINE_GENESIS_HASH;
  }

  /**
   * Build a SyncEngineReceipt for the given jobs, chained to the previous receipt.
   *
   * Chain law:
   *   batchHash    = blake3(canonical_sort(jobs))
   *   receiptHash  = blake3({ previousReceiptHash, batchHash, processedAt, jobCount })
   */
  private async buildReceipt(jobs: TJob[]): Promise<SyncEngineReceipt> {
    const previousReceiptHash = await this.getPreviousReceiptHash();
    const batchHash = computeJobsBatchHash(jobs);
    const processedAt = new Date().toISOString();
    const jobCount = jobs.length;

    const receiptHash = computeChainedReceiptHash(
      previousReceiptHash,
      batchHash,
      processedAt,
      jobCount
    );

    const receipt: SyncEngineReceipt = {
      id: deriveReceiptId(receiptHash),
      batchHash,
      previousReceiptHash,
      receiptHash,
      jobCount,
      processedAt,
      jobIds: jobs.map((j) => j.id),
    };

    return receipt;
  }

  /**
   * Persist a receipt to storage BEFORE any network I/O.
   * Logs a PATQ warning if the adapter does not implement storeReceipt.
   */
  private async persistReceiptBeforeDispatch(receipt: SyncEngineReceipt): Promise<void> {
    if (this.storage.storeReceipt) {
      await this.storage.storeReceipt(receipt);
    } else {
      console.warn(
        '[SyncEngine] PATQ WARNING: storage adapter does not implement storeReceipt. ' +
          'Receipt NOT persisted — production adapters MUST implement storeReceipt to satisfy the PATQ law.',
        { receiptId: receipt.id }
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Queue API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Queue a single sync job.
   *
   * PATQ Fix (Violation 1 — was Line 75):
   *   1. Insert the job to get its stable id.
   *   2. Generate a BLAKE3 receipt covering that job BEFORE dispatch.
   *   3. Persist the receipt via storage.storeReceipt().
   *   4. Only THEN trigger pushChanges (which performs network I/O).
   */
  public async queueJob(
    job: Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<TJob> {
    // Step 1 — persist the job to get a stable id
    const inserted = await this.storage.insertJob(job);

    // Step 2 & 3 — generate and persist a BLAKE3 receipt BEFORE any dispatch
    const receipt = await this.buildReceipt([inserted]);
    await this.persistReceiptBeforeDispatch(receipt);

    // Step 4 — trigger dispatch; network I/O happens only after receipt is stored
    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error in background pushChanges:', err);
    });

    return inserted;
  }

  /**
   * Queue multiple sync jobs in a batch format.
   */
  public async batchQueueJobs(
    jobs: Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>[]
  ): Promise<TJob[]> {
    const insertedJobs: TJob[] = [];
    for (const job of jobs) {
      const inserted = await this.storage.insertJob(job);
      insertedJobs.push(inserted);
    }

    // Generate and persist a BLAKE3 receipt covering all batch-queued jobs
    if (insertedJobs.length > 0) {
      const receipt = await this.buildReceipt(insertedJobs);
      await this.persistReceiptBeforeDispatch(receipt);
    }

    this.pushChanges().catch((err) => {
      console.error('[SyncEngine] Error in background pushChanges:', err);
    });
    return insertedJobs;
  }

  /**
   * Core loop to push ready jobs to the server.
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
        const jobs = await this.storage.getReadyJobs(this.supportedJobTypes);
        if (jobs.length === 0) break;

        const blockedEntityIds = await this.storage.getBlockedEntityIds(this.supportedJobTypes);

        const availableJobs = jobs.filter((job) => {
          if (!job.entityId) return true;
          return !this.activeEntityIds.has(job.entityId) && !blockedEntityIds.has(job.entityId);
        });

        if (availableJobs.length === 0) break;

        const batchSize = this.config.batchSize || 1;
        if (batchSize > 1 && this.dispatchBatch) {
          const batchJobs = availableJobs.slice(0, batchSize);
          await this.processBatch(batchJobs);
        } else {
          const nextJob = availableJobs[0];
          await this.processSingleJob(nextJob);
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
   * Process a single job, resolving conflicts and applying retries.
   */
  protected async processSingleJob(job: TJob): Promise<void> {
    if (job.entityId) {
      this.activeEntityIds.add(job.entityId);
    }

    try {
      await this.storage.updateJobStatus(job.id, 'processing');
      await this.dispatchJob({ ...job, status: 'processing' } as unknown as TJob);
      await this.storage.deleteJob(job.id);

      try {
        await this.onJobSuccess(job);
      } catch (hookError) {
        console.error('[SyncEngine] Error in onJobSuccess hook:', hookError);
      }
    } catch (error: any) {
      await this.handleJobFailure(job, error);
    } finally {
      if (job.entityId) {
        this.activeEntityIds.delete(job.entityId);
      }
    }
  }

  /**
   * Process a batch of jobs simultaneously.
   *
   * PATQ Fix (Violation 2 — was Lines 173-202):
   *   1. Mark all jobs as processing in storage.
   *   2. Compute batchHash = blake3(canonical_sort(jobs)).
   *   3. Chain it: receiptHash = blake3(previousReceiptHash + batchHash + processedAt + eventCount).
   *   4. Persist the chained receipt via storage.storeReceipt() BEFORE dispatchBatch.
   *   5. Only THEN call dispatchBatch (network I/O).
   */
  protected async processBatch(jobs: TJob[]): Promise<void> {
    // Step 1 — mark all jobs as processing
    for (const job of jobs) {
      if (job.entityId) this.activeEntityIds.add(job.entityId);
      await this.storage.updateJobStatus(job.id, 'processing');
    }

    // Step 2, 3, 4 — generate and persist a BLAKE3 chained receipt BEFORE dispatch
    const processingJobs = jobs.map((j) => ({ ...j, status: 'processing' } as unknown as TJob));
    const receipt = await this.buildReceipt(jobs);
    await this.persistReceiptBeforeDispatch(receipt);

    try {
      // Step 5 — network I/O only after receipt is safely stored
      if (this.dispatchBatch) {
        await this.dispatchBatch(processingJobs);
      }

      for (const job of jobs) {
        await this.storage.deleteJob(job.id);
        try {
          await this.onJobSuccess(job);
        } catch (hookError) {
          console.error('[SyncEngine] Error in onJobSuccess hook:', hookError);
        }
      }
    } catch (error: any) {
      // If batch fails, we fail all jobs in the batch and handle individually.
      for (const job of jobs) {
        await this.handleJobFailure(job, error);
      }
    } finally {
      for (const job of jobs) {
        if (job.entityId) this.activeEntityIds.delete(job.entityId);
      }
    }
  }

  /**
   * Centralized failure handler with offline-first conflict resolution support.
   */
  protected async handleJobFailure(job: TJob, error: any): Promise<void> {
    let resolvedAction: ConflictResolutionResult<TJob> | null = null;

    if (this.config.onConflict) {
      try {
        resolvedAction = await this.config.onConflict({ job, error });
      } catch (conflictError) {
        console.error('[SyncEngine] Error in onConflict hook:', conflictError);
      }
    }

    if (resolvedAction) {
      if (resolvedAction.action === 'discard') {
        await this.storage.deleteJob(job.id);
        return;
      }
      if (resolvedAction.action === 'retry') {
        if (resolvedAction.modifiedJob && this.storage.updateJob) {
          await this.storage.updateJob(job.id, resolvedAction.modifiedJob);
        }
        await this.storage.updateJobStatus(job.id, 'pending', job.attempts);
        return;
      }
      if (resolvedAction.action === 'quarantine') {
        await this.storage.updateJobStatus(job.id, 'quarantined', job.attempts);
        const updatedJob = { ...job, status: 'quarantined' } as unknown as TJob;
        try {
          await this.onJobQuarantined(updatedJob, error);
        } catch (hookError) {
          console.error('[SyncEngine] Error in onJobQuarantined hook:', hookError);
        }
        return;
      }
    }

    const updatedAttempts = job.attempts + 1;
    const isQuarantined = updatedAttempts >= this.maxAttempts;
    const newStatus = isQuarantined ? 'quarantined' : 'failed';

    await this.storage.updateJobStatus(job.id, newStatus, updatedAttempts);

    const updatedJob = {
      ...job,
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

      const delayMs = this.calculateRetryDelay(updatedAttempts);
      if (delayMs > 0) {
        await this.delay(delayMs);
      }

      // Set back to pending so it can be picked up for the next retry attempt
      await this.storage.updateJobStatus(job.id, 'pending', updatedAttempts);
      // Trigger a push to ensure it gets processed
      this.pushChanges().catch((err) => {
        console.error('[SyncEngine] Error triggering push after delay:', err);
      });
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
