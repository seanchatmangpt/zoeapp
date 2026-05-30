import { SyncEngine } from './syncEngine';
import { SyncJob } from '../db/schema';

// Mock the database client structure, exposing the mock hooks directly
jest.mock('../db/db', () => {
  const mockReturningFn = jest.fn();
  const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
  const mockInsertFn = jest.fn().mockReturnValue({ values: mockValuesFn });

  const mockOrderByFn = jest.fn();
  const mockWhereSelectFn = jest.fn().mockReturnValue({ orderBy: mockOrderByFn });
  const mockFromFn = jest.fn().mockReturnValue({ where: mockWhereSelectFn });
  const mockSelectFn = jest.fn().mockReturnValue({ from: mockFromFn });

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
    },
  };
});

// Import after mocking so hoisted mocks take effect
import { db } from '../db/db';

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
    await this.mockOnSuccess(job);
  }

  protected override async onJobFailure(job: SyncJob, error: any): Promise<void> {
    await this.mockOnFailure(job, error);
  }

  protected override async onJobQuarantined(job: SyncJob, error: any): Promise<void> {
    await this.mockOnQuarantined(job, error);
  }
}

describe('SyncEngine Outbox System', () => {
  let engine: TestSyncEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new TestSyncEngine();
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

      // First query in loop returns [job1, job2]
      mockedDb._mockOrderBy.mockResolvedValueOnce([job1, job2]);
      // Second loop (after job1 is successfully processed) returns [job2]
      mockedDb._mockOrderBy.mockResolvedValueOnce([job2]);
      // Third loop returns []
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(2);
      expect(engine.mockDispatchJob).toHaveBeenNthCalledWith(1, { ...job1, status: 'processing' });
      expect(engine.mockDispatchJob).toHaveBeenNthCalledWith(2, { ...job2, status: 'processing' });

      expect(mockedDb._mockDelete).toHaveBeenCalledTimes(2);
      expect(engine.mockOnSuccess).toHaveBeenCalledTimes(2);
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

      // First run: job fails once
      mockedDb._mockOrderBy.mockResolvedValueOnce([job]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockUpdate).toHaveBeenCalled();
      expect(mockedDb._mockSet).toHaveBeenCalledWith({
        status: 'failed',
        attempts: 1,
      });
      expect(engine.mockOnFailure).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, status: 'failed', attempts: 1 }),
        error
      );

      // Reset mocks for second run (quarantine check)
      jest.clearAllMocks();

      const failedJob: SyncJob = {
        ...job,
        status: 'failed',
        attempts: 2, // At 2 attempts, next failure makes it 3 (maxAttempts)
      };

      mockedDb._mockOrderBy.mockResolvedValueOnce([failedJob]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);
      engine.mockDispatchJob.mockRejectedValueOnce(error);

      await engine.pushChanges();

      expect(mockedDb._mockSet).toHaveBeenCalledWith({
        status: 'quarantined',
        attempts: 3,
      });
      expect(engine.mockOnQuarantined).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, status: 'quarantined', attempts: 3 }),
        error
      );
    });

    it('should enforce key concurrency serialization and skip blocked entityIds', async () => {
      const jobA1: SyncJob = {
        id: 20,
        jobType: 'update_entity',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: 'same_entity',
        createdAt: new Date(),
      };

      const jobA2: SyncJob = {
        id: 21,
        jobType: 'update_entity',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: 'same_entity',
        createdAt: new Date(),
      };

      const jobB: SyncJob = {
        id: 22,
        jobType: 'update_entity',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        entityId: 'other_entity',
        createdAt: new Date(),
      };

      // Manually simulate that 'same_entity' is currently being processed/locked
      engine['activeEntityIds'].add('same_entity');

      // The loop will fetch all jobs. It will skip jobA1 and jobA2 because 'same_entity' is active,
      // and will process jobB.
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2, jobB]);
      // The second iteration will fetch the remaining jobs, see they are still blocked, and break.
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2]);

      engine.mockDispatchJob.mockResolvedValue(undefined);

      await engine.pushChanges();

      // Only jobB (id 22) should have been processed
      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(1);
      expect(engine.mockDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 22 }));

      // Now unlock 'same_entity' and run pushChanges again
      engine['activeEntityIds'].delete('same_entity');
      jest.clearAllMocks();

      // Reset mock database responses for the second run
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA1, jobA2]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([jobA2]);
      mockedDb._mockOrderBy.mockResolvedValueOnce([]);

      await engine.pushChanges();

      // Now both jobA1 and jobA2 are processed sequentially
      expect(engine.mockDispatchJob).toHaveBeenCalledTimes(2);
      expect(engine.mockDispatchJob).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 20 }));
      expect(engine.mockDispatchJob).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 21 }));
    });
  });
});
