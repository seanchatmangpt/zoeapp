/**
 * @file syncEngine.test.ts
 *
 * Test suite for the PATQ-law-compliant DrizzleSyncStorageAdapter and SyncEngine.
 *
 * Coverage focuses on:
 *   1. Gate enforcement — rejected and quarantined events are never silently dropped.
 *   2. Receipt-before-insert — BLAKE3 receipt row must be written before the sync_queue row.
 *   3. Receipt commit — receipt is updated to 'committed' after successful job insert.
 *   4. Quarantine persistence — gate-rejected jobs are written to sync_job_quarantine.
 *   5. All original SyncEngine outbox behaviours remain intact.
 */

import { SyncEngine, AdmissionGateError } from '../syncEngine';
import { SyncJob, syncQueue, syncAdmissionReceipts, syncJobQuarantine } from '../../db/schema';
import { db } from '../../db/db';
import type { AdmissionGate, SyncEvent, AdmissionDecision } from '../TrueXSyncReplicationEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Database mock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * We need a more sophisticated mock that tracks WHICH table is being operated on
 * and routes calls appropriately. The admission gate enforcement adds:
 *   - db.select().from(syncAdmissionReceipts)  — getLatestReceiptHash()
 *   - db.insert(syncAdmissionReceipts).values() — write receipt pre-insert
 *   - db.insert(syncQueue).values().returning() — write event row
 *   - db.update(syncAdmissionReceipts).set().where() — commit/fail receipt
 *   - db.insert(syncJobQuarantine).values() — quarantine rejected events
 */
jest.mock('../../db/db', () => {
  // ── admission receipts select mock (returns empty array = genesis hash by default)
  const mockAdmissionReceiptsSelectWhere = jest.fn().mockResolvedValue([]);
  const mockAdmissionReceiptsSelectFrom = jest.fn().mockReturnValue(
    Promise.resolve([])
  );

  // ── admission receipts insert mock
  const mockAdmissionReceiptsInsertValues = jest.fn().mockResolvedValue(undefined);
  const mockAdmissionReceiptsInsert = jest.fn().mockReturnValue({
    values: mockAdmissionReceiptsInsertValues,
  });

  // ── admission receipts update mock
  const mockAdmissionReceiptsUpdateWhere = jest.fn().mockResolvedValue(undefined);
  const mockAdmissionReceiptsUpdateSet = jest.fn().mockReturnValue({
    where: mockAdmissionReceiptsUpdateWhere,
  });
  const mockAdmissionReceiptsUpdate = jest.fn().mockReturnValue({
    set: mockAdmissionReceiptsUpdateSet,
  });

  // ── sync_queue insert mock
  const mockReturningFn = jest.fn();
  const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
  const mockSyncQueueInsert = jest.fn().mockReturnValue({ values: mockValuesFn });

  // ── sync_job_quarantine insert mock
  const mockQuarantineInsertValues = jest.fn().mockResolvedValue(undefined);
  const mockQuarantineInsert = jest.fn().mockReturnValue({
    values: mockQuarantineInsertValues,
  });

  // ── Generic select mock for sync_queue queries (getReadyJobs, getBlockedEntityIds, getQueueStatus)
  const mockOrderByFn = jest.fn();
  const mockWhereSelectFn = jest.fn().mockImplementation(() => {
    const p = Promise.resolve([]);
    return Object.assign(p, { orderBy: mockOrderByFn });
  });
  const mockFromFn = jest.fn().mockReturnValue({ where: mockWhereSelectFn });

  const mockWhereBlockedFn = jest.fn().mockResolvedValue([]);
  const mockFromBlockedFn = jest.fn().mockReturnValue({ where: mockWhereBlockedFn });

  // ── Main insert router — dispatches to the correct table mock
  const mockInsertFn = jest.fn().mockImplementation((table: any) => {
    if (table && table[Symbol.for('drizzle:IsDrizzleTable')]) {
      const tableName: string =
        (table as any)._.name ??
        (table as any)._ ?.config?.name ??
        '';
      if (tableName === 'sync_admission_receipts') return mockAdmissionReceiptsInsert(table);
      if (tableName === 'sync_job_quarantine') return mockQuarantineInsert(table);
    }
    // Default: sync_queue insert
    return mockSyncQueueInsert(table);
  });

  // ── Main select router
  const mockSelectFn = jest.fn().mockImplementation((fields?: any) => {
    if (fields && fields.entityId) {
      return { from: mockFromBlockedFn };
    }
    // All selects (including admission receipt select) return from mockFromFn
    return { from: mockFromFn };
  });

  // ── Main update router
  const mockWhereUpdateFn = jest.fn();
  const mockSetFn = jest.fn().mockReturnValue({ where: mockWhereUpdateFn });
  const mockUpdateFn = jest.fn().mockImplementation((table: any) => {
    if (table && (table as any)._.name === 'sync_admission_receipts') {
      return mockAdmissionReceiptsUpdate(table);
    }
    return { set: mockSetFn };
  });

  // ── Delete mock
  const mockWhereDeleteFn = jest.fn();
  const mockDeleteFn = jest.fn().mockReturnValue({ where: mockWhereDeleteFn });

  return {
    db: {
      insert: mockInsertFn,
      select: mockSelectFn,
      update: mockUpdateFn,
      delete: mockDeleteFn,

      // ── Exported mock handles for assertions
      _mockReturning: mockReturningFn,
      _mockValues: mockValuesFn,
      _mockInsert: mockInsertFn,
      _mockSyncQueueInsert: mockSyncQueueInsert,
      _mockAdmissionReceiptsInsert: mockAdmissionReceiptsInsert,
      _mockAdmissionReceiptsInsertValues: mockAdmissionReceiptsInsertValues,
      _mockAdmissionReceiptsUpdate: mockAdmissionReceiptsUpdate,
      _mockAdmissionReceiptsUpdateSet: mockAdmissionReceiptsUpdateSet,
      _mockAdmissionReceiptsUpdateWhere: mockAdmissionReceiptsUpdateWhere,
      _mockQuarantineInsert: mockQuarantineInsert,
      _mockQuarantineInsertValues: mockQuarantineInsertValues,
      _mockOrderBy: mockOrderByFn,
      _mockWhereSelect: mockWhereSelectFn,
      _mockFrom: mockFromFn,
      _mockSelect: mockSelectFn,
      _mockWhereUpdate: mockWhereUpdateFn,
      _mockSet: mockSetFn,
      _mockUpdate: mockUpdateFn,
      _mockWhereDelete: mockWhereDeleteFn,
      _mockDelete: mockDeleteFn,
      _mockWhereBlocked: mockWhereBlockedFn,
    },
  };
});

const mockedDb = db as any;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — build a minimal SyncJob for use in tests
// ─────────────────────────────────────────────────────────────────────────────

function makeSyncJob(overrides: Partial<SyncJob> = {}): SyncJob {
  return {
    id: 1,
    jobType: 'create_post',
    payload: '{"title":"Hello"}',
    status: 'pending',
    attempts: 0,
    entityId: 'post_123',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test SyncEngine subclass
// ─────────────────────────────────────────────────────────────────────────────

class TestSyncEngine extends SyncEngine {
  public mockDispatchJob = jest.fn();
  public mockOnSuccess = jest.fn();
  public mockOnFailure = jest.fn();
  public mockOnQuarantined = jest.fn();

  protected async dispatchJob(job: SyncJob): Promise<void> {
    await this.mockDispatchJob(job);
  }

  protected override async onJobSuccess(job: SyncJob): Promise<void> {
    await super.onJobSuccess(job);
    await this.mockOnSuccess(job);
  }

  protected override async onJobFailure(job: SyncJob, error: any): Promise<void> {
    await super.onJobFailure(job, error);
    await this.mockOnFailure(job, error);
  }

  protected override async onJobQuarantined(job: SyncJob, error: any): Promise<void> {
    await super.onJobQuarantined(job, error);
    await this.mockOnQuarantined(job, error);
  }
}

class TypeScopedSyncEngine extends SyncEngine {
  public supportedJobTypes = ['TYPE_A'];
  public mockDispatchJob = jest.fn();
  protected async dispatchJob(job: SyncJob): Promise<void> {
    await this.mockDispatchJob(job);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom gate implementations for testing
// ─────────────────────────────────────────────────────────────────────────────

class RejectAllGate implements AdmissionGate {
  evaluate(_event: SyncEvent): AdmissionDecision {
    return { verdict: 'reject', reason: 'test-reject: all jobs rejected' };
  }
}

class QuarantineAllGate implements AdmissionGate {
  evaluate(_event: SyncEvent): AdmissionDecision {
    return { verdict: 'quarantine', reason: 'test-quarantine: all jobs quarantined' };
  }
}

class SelectiveRejectGate implements AdmissionGate {
  evaluate(event: SyncEvent): AdmissionDecision {
    if (event.eventType === 'BLOCKED_TYPE') {
      return { verdict: 'reject', reason: 'blocked job type' };
    }
    return { verdict: 'admit' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('SyncEngine Outbox System', () => {
  let engine: TestSyncEngine;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new TestSyncEngine();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default: admission receipts select returns empty array (genesis hash path)
    mockedDb._mockFrom.mockReturnValue(Promise.resolve([]));
    // Default: admission receipts insert succeeds
    mockedDb._mockAdmissionReceiptsInsertValues.mockResolvedValue(undefined);
    // Default: admission receipts update succeeds
    mockedDb._mockAdmissionReceiptsUpdateWhere.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATQ Gate Enforcement Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATQ Admission Gate Enforcement', () => {
    it('should write a BLAKE3 receipt to sync_admission_receipts BEFORE the sync_queue insert', async () => {
      const mockJob = makeSyncJob();
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      // Track call order
      const callOrder: string[] = [];
      mockedDb._mockAdmissionReceiptsInsertValues.mockImplementation(async () => {
        callOrder.push('receipt_insert');
      });
      mockedDb._mockReturning.mockImplementation(async () => {
        callOrder.push('syncqueue_insert');
        return [mockJob];
      });

      await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        entityId: 'post_123',
      });

      expect(callOrder[0]).toBe('receipt_insert');
      expect(callOrder[1]).toBe('syncqueue_insert');
    });

    it('should commit the receipt (status=committed, jobId set) after successful sync_queue insert', async () => {
      const mockJob = makeSyncJob({ id: 42 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        entityId: 'post_123',
      });

      // The update to commit the receipt must have been called
      expect(mockedDb._mockAdmissionReceiptsUpdate).toHaveBeenCalled();
      const setCall = mockedDb._mockAdmissionReceiptsUpdateSet.mock.calls[0][0];
      expect(setCall).toMatchObject({ jobId: 42, status: 'committed' });
    });

    it('should mark receipt as failed and rethrow when the sync_queue insert fails', async () => {
      const insertError = new Error('SQLite constraint violation');
      mockedDb._mockReturning.mockRejectedValueOnce(insertError);

      await expect(
        engine.queueJob({ jobType: 'create_post', payload: '{}', entityId: 'e1' })
      ).rejects.toThrow('SQLite constraint violation');

      // Receipt must have been marked 'failed'
      expect(mockedDb._mockAdmissionReceiptsUpdate).toHaveBeenCalled();
      const setCall = mockedDb._mockAdmissionReceiptsUpdateSet.mock.calls[0][0];
      expect(setCall).toMatchObject({ status: 'failed' });
      expect(setCall.error).toContain('SQLite constraint violation');
    });

    it('should include previousReceiptHash from existing receipts in the chain', async () => {
      // Simulate an existing receipt in the table
      const existingReceiptHash = 'aabbccdd11223344556677889900aabb';
      mockedDb._mockFrom.mockReturnValueOnce(
        Promise.resolve([{ receiptHash: existingReceiptHash, admittedAt: '2026-01-01T00:00:00.000Z' }])
      );

      const mockJob = makeSyncJob({ id: 7 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      await engine.queueJob({ jobType: 'update_user', payload: '{"name":"Alice"}', entityId: 'u1' });

      const receiptValues = mockedDb._mockAdmissionReceiptsInsertValues.mock.calls[0][0];
      // The previousReceiptHash in the new receipt must equal the existing receipt's hash
      expect(receiptValues.previousReceiptHash).toBe(existingReceiptHash);
    });

    it('should throw AdmissionGateError when gate rejects a job', async () => {
      const rejectEngine = new TestSyncEngine(new RejectAllGate());

      await expect(
        rejectEngine.queueJob({ jobType: 'create_post', payload: '{}', entityId: 'e1' })
      ).rejects.toThrow(AdmissionGateError);

      await expect(
        rejectEngine.queueJob({ jobType: 'create_post', payload: '{}', entityId: 'e1' })
      ).rejects.toMatchObject({
        verdict: 'reject',
        reason: 'test-reject: all jobs rejected',
        jobType: 'create_post',
      });
    });

    it('should throw AdmissionGateError with verdict=quarantine when gate quarantines a job', async () => {
      const quarantineEngine = new TestSyncEngine(new QuarantineAllGate());

      await expect(
        quarantineEngine.queueJob({ jobType: 'sensitive_op', payload: '{}', entityId: 'e1' })
      ).rejects.toMatchObject({
        verdict: 'quarantine',
        reason: 'test-quarantine: all jobs quarantined',
        name: 'AdmissionGateError',
      });
    });

    it('should write gate-rejected jobs to sync_job_quarantine with full payload and reason', async () => {
      const rejectEngine = new TestSyncEngine(new RejectAllGate());

      await expect(
        rejectEngine.queueJob({
          jobType: 'create_post',
          payload: '{"title":"Secret"}',
          entityId: 'post_999',
        })
      ).rejects.toThrow(AdmissionGateError);

      expect(mockedDb._mockQuarantineInsert).toHaveBeenCalled();
      const quarantineValues = mockedDb._mockQuarantineInsertValues.mock.calls[0][0];
      expect(quarantineValues.jobType).toBe('create_post');
      expect(quarantineValues.payload).toBe('{"title":"Secret"}');
      expect(quarantineValues.entityId).toBe('post_999');
      expect(quarantineValues.rejectionReason).toBe('test-reject: all jobs rejected');
      expect(quarantineValues.verdict).toBe('reject');
    });

    it('should write gate-quarantined jobs to sync_job_quarantine with verdict=quarantine', async () => {
      const quarantineEngine = new TestSyncEngine(new QuarantineAllGate());

      await expect(
        quarantineEngine.queueJob({
          jobType: 'risky_op',
          payload: '{"level":"critical"}',
          entityId: 'risk_1',
        })
      ).rejects.toThrow(AdmissionGateError);

      const quarantineValues = mockedDb._mockQuarantineInsertValues.mock.calls[0][0];
      expect(quarantineValues.verdict).toBe('quarantine');
      expect(quarantineValues.payload).toBe('{"level":"critical"}');
    });

    it('should NOT insert a sync_queue row when the gate rejects', async () => {
      const rejectEngine = new TestSyncEngine(new RejectAllGate());

      await expect(
        rejectEngine.queueJob({ jobType: 'blocked', payload: '{}' })
      ).rejects.toThrow(AdmissionGateError);

      // sync_queue insert must NOT have been called
      expect(mockedDb._mockSyncQueueInsert).not.toHaveBeenCalled();
    });

    it('should NOT insert an admission receipt when the gate rejects', async () => {
      const rejectEngine = new TestSyncEngine(new RejectAllGate());

      await expect(
        rejectEngine.queueJob({ jobType: 'blocked', payload: '{}' })
      ).rejects.toThrow(AdmissionGateError);

      expect(mockedDb._mockAdmissionReceiptsInsertValues).not.toHaveBeenCalled();
    });

    it('should still log a console.error if writing to quarantine table fails (non-fatal)', async () => {
      const rejectEngine = new TestSyncEngine(new RejectAllGate());
      mockedDb._mockQuarantineInsertValues.mockRejectedValueOnce(new Error('quarantine table down'));

      await expect(
        rejectEngine.queueJob({ jobType: 'create_post', payload: '{}' })
      ).rejects.toThrow(AdmissionGateError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[PATQ] CRITICAL: Failed to write rejected job to quarantine table:',
        expect.objectContaining({ error: 'quarantine table down' })
      );
    });

    it('should use the DefaultAdmissionGate and reject jobs with empty jobType', async () => {
      // jobType === '' — the gate's eventType check will fire
      await expect(
        engine.queueJob({ jobType: '', payload: '{}', entityId: 'e1' })
      ).rejects.toThrow(AdmissionGateError);

      expect(mockedDb._mockSyncQueueInsert).not.toHaveBeenCalled();
    });

    it('should admit and process a valid job with non-empty jobType and entityId', async () => {
      const mockJob = makeSyncJob({ id: 99 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      const result = await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Valid"}',
        entityId: 'post_99',
      });

      expect(result).toEqual(mockJob);
      expect(mockedDb._mockAdmissionReceiptsInsertValues).toHaveBeenCalled();
      expect(mockedDb._mockSyncQueueInsert).toHaveBeenCalled();
    });

    it('should use genesis hash as previousReceiptHash when no prior receipts exist', async () => {
      // Empty receipts table
      mockedDb._mockFrom.mockReturnValueOnce(Promise.resolve([]));

      const mockJob = makeSyncJob({ id: 1 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      await engine.queueJob({ jobType: 'init', payload: '{}', entityId: 'e0' });

      const receiptValues = mockedDb._mockAdmissionReceiptsInsertValues.mock.calls[0][0];
      // previousReceiptHash must be the BLAKE3 genesis constant — not empty string
      expect(receiptValues.previousReceiptHash).toBeTruthy();
      expect(typeof receiptValues.previousReceiptHash).toBe('string');
      expect(receiptValues.previousReceiptHash.length).toBeGreaterThan(32);
    });

    it('should include payloadHash, receiptHash, admittedAt, and id in the receipt row', async () => {
      const mockJob = makeSyncJob({ id: 5 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      await engine.queueJob({ jobType: 'update', payload: '{"x":1}', entityId: 'e1' });

      const receiptValues = mockedDb._mockAdmissionReceiptsInsertValues.mock.calls[0][0];
      expect(receiptValues.id).toMatch(/^rcpt_[0-9a-f]{32}$/);
      expect(receiptValues.payloadHash).toBeTruthy();
      expect(receiptValues.receiptHash).toBeTruthy();
      expect(receiptValues.admittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(receiptValues.status).toBe('pre_insert');
    });

    it('should handle null entityId gracefully through the gate', async () => {
      const mockJob = makeSyncJob({ id: 2, entityId: null });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      // null entityId: the gate's entityId check coerces to empty string — but DefaultAdmissionGate
      // rejects empty entityId. Test that a job with no entityId is correctly rejected.
      await expect(
        engine.queueJob({ jobType: 'create_post', payload: '{}' })
      ).rejects.toThrow(AdmissionGateError);

      // Quarantine entry must have been written
      const quarantineValues = mockedDb._mockQuarantineInsertValues.mock.calls[0][0];
      expect(quarantineValues.entityId).toBeNull();
    });

    it('should log but not throw if committing the receipt fails after a successful insert', async () => {
      const mockJob = makeSyncJob({ id: 11 });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);
      mockedDb._mockAdmissionReceiptsUpdateWhere.mockRejectedValueOnce(new Error('receipt commit failed'));

      // Should NOT throw — the event row was already committed
      const result = await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Fine"}',
        entityId: 'post_11',
      });

      expect(result).toEqual(mockJob);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[PATQ] Failed to commit admission receipt after event insert:',
        expect.objectContaining({ error: 'receipt commit failed' })
      );
    });

    it('should produce different receiptHash values for different payloads', async () => {
      const job1 = makeSyncJob({ id: 10 });
      const job2 = makeSyncJob({ id: 11, payload: '{"title":"Different"}' });

      mockedDb._mockReturning
        .mockResolvedValueOnce([job1])
        .mockResolvedValueOnce([job2]);

      await engine.queueJob({ jobType: 'create_post', payload: '{"title":"Hello"}', entityId: 'e1' });
      const receipt1 = mockedDb._mockAdmissionReceiptsInsertValues.mock.calls[0][0];

      jest.clearAllMocks();
      mockedDb._mockAdmissionReceiptsInsertValues.mockResolvedValue(undefined);
      mockedDb._mockAdmissionReceiptsUpdateWhere.mockResolvedValue(undefined);
      mockedDb._mockFrom.mockReturnValue(Promise.resolve([]));

      await engine.queueJob({ jobType: 'create_post', payload: '{"title":"Different"}', entityId: 'e1' });
      const receipt2 = mockedDb._mockAdmissionReceiptsInsertValues.mock.calls[0][0];

      expect(receipt1.payloadHash).not.toBe(receipt2.payloadHash);
      expect(receipt1.receiptHash).not.toBe(receipt2.receiptHash);
    });

    it('should selectively reject only blocked job types with SelectiveRejectGate', async () => {
      const selectiveEngine = new TestSyncEngine(new SelectiveRejectGate());
      const mockJob = makeSyncJob({ id: 20, jobType: 'allowed_type' });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      // Allowed job should pass
      const result = await selectiveEngine.queueJob({
        jobType: 'allowed_type',
        payload: '{}',
        entityId: 'e1',
      });
      expect(result).toEqual(mockJob);

      // Blocked job should be rejected
      jest.clearAllMocks();
      mockedDb._mockAdmissionReceiptsInsertValues.mockResolvedValue(undefined);
      mockedDb._mockAdmissionReceiptsUpdateWhere.mockResolvedValue(undefined);
      mockedDb._mockFrom.mockReturnValue(Promise.resolve([]));
      mockedDb._mockQuarantineInsertValues.mockResolvedValue(undefined);

      await expect(
        selectiveEngine.queueJob({ jobType: 'BLOCKED_TYPE', payload: '{}', entityId: 'e1' })
      ).rejects.toThrow(AdmissionGateError);

      expect(mockedDb._mockSyncQueueInsert).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // queueJob — original behaviour tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('queueJob', () => {
    it('should insert a pending job and call pushChanges in the background', async () => {
      const mockJob = makeSyncJob();
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      const result = await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        entityId: 'post_123',
      });

      expect(mockedDb._mockSyncQueueInsert).toHaveBeenCalled();
      expect(mockedDb._mockValues).toHaveBeenCalledWith({
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        entityId: 'post_123',
        status: 'pending',
        attempts: 0,
      });
      expect(result).toEqual(mockJob);
    });

    it('should log an error if background pushChanges throws', async () => {
      const mockJob = makeSyncJob({ entityId: null });
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);

      const pushChangesSpy = jest
        .spyOn(engine, 'pushChanges')
        .mockRejectedValueOnce(new Error('background failure'));

      await engine.queueJob({ jobType: 'create_post', payload: '{}', entityId: 'e_bg' });

      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncEngine] Error in background pushChanges:',
        expect.any(Error)
      );
      pushChangesSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // pushChanges — original behaviour tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('pushChanges', () => {
    it('should process pending jobs sequentially and delete them on success', async () => {
      const job1 = makeSyncJob({ id: 10, jobType: 'update_user', payload: '{"name":"Alice"}', entityId: 'user_1' });
      const job2 = makeSyncJob({ id: 11, jobType: 'update_user', payload: '{"name":"Bob"}', entityId: 'user_2' });

      mockedDb._mockOrderBy.mockResolvedValueOnce([job1, job2]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([job2]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(2);
      expect(mockedDb._mockDelete).toHaveBeenCalledTimes(2);
      expect(engine.mockOnSuccess).toHaveBeenCalledTimes(2);
    });

    it('should log an error if onJobSuccess hook throws', async () => {
      const job1 = makeSyncJob({ id: 10, jobType: 'update_user', payload: '{}', entityId: null });

      mockedDb._mockOrderBy.mockResolvedValueOnce([job1]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockResolvedValue(undefined);
      engine.mockOnSuccess.mockRejectedValueOnce(new Error('success hook failure'));

      await engine.pushChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncEngine] Error in onJobSuccess hook:',
        expect.any(Error)
      );
    });

    it('should increment attempts and retry failed jobs, quarantining on maxAttempts', async () => {
      const job = makeSyncJob({
        id: 5,
        jobType: 'send_email',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: null,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      const error = new Error('Network timeout');

      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'failed', attempts: 1 });
      expect(engine.mockOnFailure).toHaveBeenCalled();

      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      jest.clearAllMocks();
      mockedDb._mockAdmissionReceiptsInsertValues.mockResolvedValue(undefined);
      mockedDb._mockAdmissionReceiptsUpdateWhere.mockResolvedValue(undefined);
      mockedDb._mockFrom.mockReturnValue(Promise.resolve([]));

      const failedJob = { ...job, status: 'failed' as const, attempts: 2 };
      mockedDb._mockOrderBy.mockResolvedValueOnce([failedJob]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'quarantined', attempts: 3 });
      expect(engine.mockOnQuarantined).toHaveBeenCalled();
    });

    it('should log an error if onJobFailure hook throws', async () => {
      const job = makeSyncJob({ id: 5, jobType: 'test', payload: '{}', status: 'pending', attempts: 0, entityId: null });
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(new Error('fail'));
      engine.mockOnFailure.mockRejectedValueOnce(new Error('failure hook error'));

      await engine.pushChanges();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in onJobFailure hook:', expect.any(Error));
    });

    it('should log an error if onJobQuarantined hook throws', async () => {
      const job = makeSyncJob({ id: 5, jobType: 'test', payload: '{}', status: 'failed', attempts: 2, entityId: null });
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(new Error('fail'));
      engine.mockOnQuarantined.mockRejectedValueOnce(new Error('quarantine hook error'));

      await engine.pushChanges();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in onJobQuarantined hook:', expect.any(Error));
    });

    it('should enforce entity concurrency serialization and skip blocked entityIds', async () => {
      const jobA1 = makeSyncJob({ id: 20, jobType: 'update_entity', entityId: 'same_entity' });
      const jobA2 = makeSyncJob({ id: 21, jobType: 'update_entity', entityId: 'same_entity' });
      const jobB = makeSyncJob({ id: 22, jobType: 'update_entity', entityId: 'other_entity' });

      engine['activeEntityIds'].add('same_entity');

      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2, jobB]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(1);
      expect(engine.mockDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 22 }));
    });

    it('should queue a rerun of pushChanges via needsPush if pushChanges is called during execution', async () => {
      const job = makeSyncJob({ id: 30, jobType: 'test_job', entityId: null });

      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockImplementationOnce(async () => {
        await engine.pushChanges();
      });

      await engine.pushChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(2);
    });

    it('should log an error if the re-triggered background pushChanges throws via needsPush', async () => {
      const job = makeSyncJob({ id: 30, jobType: 'test_job', entityId: null });

      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      mockedDb._mockOrderBy.mockRejectedValueOnce(new Error('re-trigger fail'));

      engine.mockDispatchJob.mockImplementationOnce(async () => {
        await engine.pushChanges();
      });

      await engine.pushChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncEngine] Error in re-triggered background pushChanges:',
        expect.any(Error)
      );
    });

    it('should skip jobs for an entity if there is a quarantined or processing job for that entity', async () => {
      const jobA1 = makeSyncJob({ id: 40, jobType: 'update_entity', entityId: 'blocked_entity' });
      const jobB = makeSyncJob({ id: 41, jobType: 'update_entity', entityId: 'free_entity' });

      mockedDb._mockWhereBlocked.mockResolvedValueOnce([{ entityId: 'blocked_entity' }, { entityId: null }]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobB]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(1);
      expect(engine.mockDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 41 }));
    });

    it('should filter by supportedJobTypes if defined in the subclass', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      await scopedEngine.pushChanges();

      expect(mockedDb._mockWhereSelect).toHaveBeenCalled();
      const whereArg = mockedDb._mockWhereSelect.mock.calls[0][0];
      expect(whereArg).toBeDefined();
    });

    it('should check blocked entities with supportedJobTypes if defined in the subclass', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      const jobA = makeSyncJob({ id: 50, jobType: 'TYPE_A', entityId: 'entity1' });

      mockedDb._mockWhereBlocked.mockResolvedValueOnce([]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      scopedEngine.mockDispatchJob.mockResolvedValue(undefined);

      await scopedEngine.pushChanges();

      expect(mockedDb._mockWhereBlocked).toHaveBeenCalled();
      const blockedWhereArg = mockedDb._mockWhereBlocked.mock.calls[0][0];
      expect(blockedWhereArg).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // retryQuarantined
  // ─────────────────────────────────────────────────────────────────────────

  describe('retryQuarantined', () => {
    it('should reset quarantined jobs back to pending', async () => {
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockResolvedValue();

      await engine.retryQuarantined();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'pending', attempts: 0 });
      expect(pushChangesSpy).toHaveBeenCalled();
    });

    it('should log an error if triggering push after retryQuarantined throws', async () => {
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockRejectedValueOnce(new Error('retry push fail'));

      await engine.retryQuarantined();
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncEngine] Error triggering push after retryQuarantined:',
        expect.any(Error)
      );
    });

    it('should apply supportedJobTypes filter in retryQuarantined if defined', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      jest.spyOn(scopedEngine, 'pushChanges').mockResolvedValue();

      await scopedEngine.retryQuarantined();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'pending', attempts: 0 });
      expect(mockedDb._mockWhereUpdate).toHaveBeenCalled();

      const whereArg = mockedDb._mockWhereUpdate.mock.calls[0][0];
      expect(whereArg).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // recoverStuckJobs
  // ─────────────────────────────────────────────────────────────────────────

  describe('recoverStuckJobs', () => {
    it('should reset processing jobs to failed in recoverStuckJobs', async () => {
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockResolvedValue();
      await engine.recoverStuckJobs();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'failed' });
      expect(pushChangesSpy).toHaveBeenCalled();
    });

    it('should log an error if triggering push after recoverStuckJobs throws', async () => {
      jest.spyOn(engine, 'pushChanges').mockRejectedValueOnce(new Error('recover push fail'));

      await engine.recoverStuckJobs();
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncEngine] Error triggering push after recoverStuckJobs:',
        expect.any(Error)
      );
    });

    it('should apply supportedJobTypes filter in recoverStuckJobs if defined', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      jest.spyOn(scopedEngine, 'pushChanges').mockResolvedValue();

      await scopedEngine.recoverStuckJobs();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'failed' });
      expect(mockedDb._mockWhereUpdate).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getQueueStatus
  // ─────────────────────────────────────────────────────────────────────────

  describe('getQueueStatus', () => {
    const mockJobs: SyncJob[] = [
      makeSyncJob({ id: 1, status: 'pending', attempts: 0, entityId: null }),
      makeSyncJob({ id: 2, status: 'pending', attempts: 0, entityId: null }),
      makeSyncJob({ id: 3, status: 'processing', attempts: 0, entityId: null }),
      makeSyncJob({ id: 4, status: 'failed', attempts: 1, entityId: null }),
      makeSyncJob({ id: 5, status: 'quarantined', attempts: 3, entityId: null }),
    ];

    it('should return correct queue status counts', async () => {
      mockedDb._mockFrom.mockReturnValueOnce(Promise.resolve(mockJobs));

      const status = await engine.getQueueStatus();

      expect(status.total).toBe(5);
      expect(status.pending).toBe(2);
      expect(status.processing).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.quarantined).toBe(1);
      expect(status.jobs).toEqual(mockJobs);
    });

    it('should apply supportedJobTypes filter in getQueueStatus if defined', async () => {
      const scopedEngine = new TypeScopedSyncEngine();

      mockedDb._mockFrom.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue(mockJobs),
      });

      const status = await scopedEngine.getQueueStatus();

      expect(status.total).toBe(5);
    });
  });
});
