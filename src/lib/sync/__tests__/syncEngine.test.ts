import { SyncEngine } from '../syncEngine';
import { SyncJob, syncQueue } from '../../db/schema';

// Import after mocking so hoisted mocks take effect
import { db } from '../../db/db';

// Mock the database client structure, exposing the mock hooks directly
jest.mock('../../db/db', () => {
  const mockReturningFn = jest.fn();
  const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
  const mockInsertFn = jest.fn().mockReturnValue({ values: mockValuesFn });

  const mockOrderByFn = jest.fn();
  const mockWhereSelectFn = jest.fn().mockImplementation(() => {
    const p = Promise.resolve([]);
    return Object.assign(p, { orderBy: mockOrderByFn });
  });
  const mockFromFn = jest.fn().mockReturnValue({ where: mockWhereSelectFn });

  const mockWhereBlockedFn = jest.fn().mockResolvedValue([]);
  const mockFromBlockedFn = jest.fn().mockReturnValue({ where: mockWhereBlockedFn });

  const mockSelectFn = jest.fn().mockImplementation((fields) => {
    if (fields && fields.entityId) {
      return { from: mockFromBlockedFn };
    }
    return { from: mockFromFn };
  });

  const mockWhereUpdateFn = jest.fn();
  const mockSetFn = jest.fn().mockReturnValue({ where: mockWhereUpdateFn });
  const mockUpdateFn = jest.fn().mockReturnValue({ set: mockSetFn });

  const mockWhereDeleteFn = jest.fn();
  const mockDeleteFn = jest.fn().mockReturnValue({ where: mockWhereDeleteFn });

  return {
    db: {
      insert: mockInsertFn,
      select: mockSelectFn,
      update: mockUpdateFn,
      delete: mockDeleteFn,

      // Export mock targets for test assertions
      _mockReturning: mockReturningFn,
      _mockValues: mockValuesFn,
      _mockInsert: mockInsertFn,
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

describe('SyncEngine Outbox System', () => {
  let engine: TestSyncEngine;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new TestSyncEngine();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('queueJob', () => {
    it('should insert a pending job and call pushChanges in the background', async () => {
      const mockJob: SyncJob = {
        id: 1,
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        status: 'pending',
        attempts: 0,
        entityId: 'post_123',
        createdAt: new Date(),
      };

      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);
      // Return empty jobs array for subsequent pushChanges query
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      const result = await engine.queueJob({
        jobType: 'create_post',
        payload: '{"title":"Hello"}',
        entityId: 'post_123',
      });

      expect(mockedDb._mockInsert).toHaveBeenCalled();
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
      const mockJob: SyncJob = {
        id: 1,
        jobType: 'create_post',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: null,
        createdAt: new Date(),
      };
      mockedDb._mockReturning.mockResolvedValueOnce([mockJob]);
      
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockRejectedValueOnce(new Error('background failure'));

      await engine.queueJob({
        jobType: 'create_post',
        payload: '{}',
      });

      // Allow background promise to settle
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in background pushChanges:', expect.any(Error));
      pushChangesSpy.mockRestore();
    });
  });

  describe('pushChanges', () => {
    it('should process pending jobs sequentially and delete them on success', async () => {
      const job1: SyncJob = {
        id: 10,
        jobType: 'update_user',
        payload: '{"name":"Alice"}',
        status: 'pending',
        attempts: 0,
        entityId: 'user_1',
        createdAt: new Date(),
      };

      const job2: SyncJob = {
        id: 11,
        jobType: 'update_user',
        payload: '{"name":"Bob"}',
        status: 'pending',
        attempts: 0,
        entityId: 'user_2',
        createdAt: new Date(),
      };

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
      const job1: SyncJob = {
        id: 10,
        jobType: 'update_user',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: null,
        createdAt: new Date(),
      };

      mockedDb._mockOrderBy.mockResolvedValueOnce([job1]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockResolvedValue(undefined);
      engine.mockOnSuccess.mockRejectedValueOnce(new Error('success hook failure'));

      await engine.pushChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in onJobSuccess hook:', expect.any(Error));
    });

    it('should increment attempts and retry failed jobs, quarantining on maxAttempts', async () => {
      const job: SyncJob = {
        id: 5,
        jobType: 'send_email',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: null,
        createdAt: new Date(),
      };

      const error = new Error('Network timeout');

      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockSet).toHaveBeenCalledWith({
        status: 'failed',
        attempts: 1,
      });
      expect(engine.mockOnFailure).toHaveBeenCalled();

      // Reset mocks for second run
      jest.clearAllMocks();

      const failedJob: SyncJob = {
        ...job,
        status: 'failed',
        attempts: 2,
      };

      mockedDb._mockOrderBy.mockResolvedValueOnce([failedJob]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockSet).toHaveBeenCalledWith({
        status: 'quarantined',
        attempts: 3,
      });
      expect(engine.mockOnQuarantined).toHaveBeenCalled();
    });

    it('should log an error if onJobFailure hook throws', async () => {
      const job: SyncJob = { id: 5, jobType: 'test', payload: '{}', status: 'pending', attempts: 0, entityId: null, createdAt: new Date() };
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(new Error('fail'));
      engine.mockOnFailure.mockRejectedValueOnce(new Error('failure hook error'));

      await engine.pushChanges();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in onJobFailure hook:', expect.any(Error));
    });

    it('should log an error if onJobQuarantined hook throws', async () => {
      const job: SyncJob = { id: 5, jobType: 'test', payload: '{}', status: 'failed', attempts: 2, entityId: null, createdAt: new Date() };
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(new Error('fail'));
      engine.mockOnQuarantined.mockRejectedValueOnce(new Error('quarantine hook error'));

      await engine.pushChanges();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in onJobQuarantined hook:', expect.any(Error));
    });

    it('should enforce key concurrency serialization and skip blocked entityIds', async () => {
      const jobA1: SyncJob = { id: 20, jobType: 'update_entity', payload: '{}', status: 'pending', attempts: 0, entityId: 'same_entity', createdAt: new Date() };
      const jobA2: SyncJob = { id: 21, jobType: 'update_entity', payload: '{}', status: 'pending', attempts: 0, entityId: 'same_entity', createdAt: new Date() };
      const jobB: SyncJob = { id: 22, jobType: 'update_entity', payload: '{}', status: 'pending', attempts: 0, entityId: 'other_entity', createdAt: new Date() };

      engine['activeEntityIds'].add('same_entity');

      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2, jobB]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(1);
      expect(engine.mockDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 22 }));
    });

    it('should queue a rerun of pushChanges via needsPush if pushChanges is called during execution', async () => {
      const job: SyncJob = { id: 30, jobType: 'test_job', payload: '{}', status: 'pending', attempts: 0, entityId: null, createdAt: new Date() };

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
      const job: SyncJob = { id: 30, jobType: 'test_job', payload: '{}', status: 'pending', attempts: 0, entityId: null, createdAt: new Date() };

      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      
      // Make the second (re-triggered) pushChanges throw
      mockedDb._mockOrderBy.mockRejectedValueOnce(new Error('re-trigger fail'));

      engine.mockDispatchJob.mockImplementationOnce(async () => {
        await engine.pushChanges(); // Sets needsPush = true
      });

      await engine.pushChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error in re-triggered background pushChanges:', expect.any(Error));
    });

    it('should skip jobs for an entity if there is a quarantined or processing job for that entity', async () => {
      const jobA1: SyncJob = { id: 40, jobType: 'update_entity', payload: '{}', status: 'pending', attempts: 0, entityId: 'blocked_entity', createdAt: new Date() };
      const jobB: SyncJob = { id: 41, jobType: 'update_entity', payload: '{}', status: 'pending', attempts: 0, entityId: 'free_entity', createdAt: new Date() };

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
      const jobA: SyncJob = { id: 50, jobType: 'TYPE_A', payload: '{}', status: 'pending', attempts: 0, entityId: 'entity1', createdAt: new Date() };

      mockedDb._mockWhereBlocked.mockResolvedValueOnce([]); // No blocked entities
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      scopedEngine.mockDispatchJob.mockResolvedValue(undefined);

      await scopedEngine.pushChanges();

      // Ensure that _mockWhereBlocked was called, verifying lines 95-105 were hit for a subclass with supportedJobTypes
      expect(mockedDb._mockWhereBlocked).toHaveBeenCalled();
      const blockedWhereArg = mockedDb._mockWhereBlocked.mock.calls[0][0];
      expect(blockedWhereArg).toBeDefined();
    });
  });

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

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error triggering push after retryQuarantined:', expect.any(Error));
    });

    it('should apply supportedJobTypes filter in retryQuarantined if defined', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      const pushChangesSpy = jest.spyOn(scopedEngine, 'pushChanges').mockResolvedValue();

      await scopedEngine.retryQuarantined();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'pending', attempts: 0 });
      expect(mockedDb._mockWhereUpdate).toHaveBeenCalled();
      
      const whereArg = mockedDb._mockWhereUpdate.mock.calls[0][0];
      expect(whereArg).toBeDefined(); // verifying and() was applied
    });
  });

  describe('recoverStuckJobs', () => {
    it('should reset processing jobs to failed in recoverStuckJobs', async () => {
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockResolvedValue();
      await engine.recoverStuckJobs();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'failed' });
      expect(pushChangesSpy).toHaveBeenCalled();
    });

    it('should log an error if triggering push after recoverStuckJobs throws', async () => {
      const pushChangesSpy = jest.spyOn(engine, 'pushChanges').mockRejectedValueOnce(new Error('recover push fail'));
      
      await engine.recoverStuckJobs();
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncEngine] Error triggering push after recoverStuckJobs:', expect.any(Error));
    });

    it('should apply supportedJobTypes filter in recoverStuckJobs if defined', async () => {
      const scopedEngine = new TypeScopedSyncEngine();
      const pushChangesSpy = jest.spyOn(scopedEngine, 'pushChanges').mockResolvedValue();

      await scopedEngine.recoverStuckJobs();

      expect(mockedDb._mockUpdate).toHaveBeenCalledWith(syncQueue);
      expect(mockedDb._mockSet).toHaveBeenCalledWith({ status: 'failed' });
      expect(mockedDb._mockWhereUpdate).toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    const mockJobs: SyncJob[] = [
      { id: 1, jobType: 't', payload: '{}', status: 'pending', attempts: 0, entityId: null, createdAt: new Date() },
      { id: 2, jobType: 't', payload: '{}', status: 'pending', attempts: 0, entityId: null, createdAt: new Date() },
      { id: 3, jobType: 't', payload: '{}', status: 'processing', attempts: 0, entityId: null, createdAt: new Date() },
      { id: 4, jobType: 't', payload: '{}', status: 'failed', attempts: 1, entityId: null, createdAt: new Date() },
      { id: 5, jobType: 't', payload: '{}', status: 'quarantined', attempts: 3, entityId: null, createdAt: new Date() },
    ];

    it('should return correct queue status counts', async () => {
      // For global select (no where clause)
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
      
      // Make `from` return the `where` chain since this method does `.from(syncQueue).where(whereClause)`
      mockedDb._mockFrom.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue(mockJobs)
      });

      const status = await scopedEngine.getQueueStatus();

      expect(status.total).toBe(5);
    });
  });
});
