import { HookPackRegistry } from '../registry';
import { HookPackLoader } from '../loader';
import { HookPackUpgrade } from '../upgrade';
import { HookPackRollback } from '../rollback';
import { VolunteerPackManifest } from '../volunteer/manifest';
import { volunteerShortageBehavior } from '../volunteer/hooks';
import { HookRuntime } from '../../hook-otp/runtime';
import { HookActorRef } from '../../hook-otp/types';
import { TensionQueueMapper } from '../packs';

// Mock the database client structure, exposing the mock hooks directly on db
jest.mock('../../../db/db', () => {
  const mockWhereSelectFn = jest.fn();
  const mockFromFn = jest.fn().mockReturnValue({ where: mockWhereSelectFn });
  const mockSelectFn = jest.fn().mockReturnValue({ from: mockFromFn });

  const mockWhereUpdateFn = jest.fn();
  const mockSetFn = jest.fn().mockReturnValue({ where: mockWhereUpdateFn });
  const mockUpdateFn = jest.fn().mockReturnValue({ set: mockSetFn });

  return {
    db: {
      select: mockSelectFn,
      update: mockUpdateFn,

      // Export mock targets for test assertions
      _mockWhereSelect: mockWhereSelectFn,
      _mockFrom: mockFromFn,
      _mockSelect: mockSelectFn,
      _mockWhereUpdate: mockWhereUpdateFn,
      _mockSet: mockSetFn,
      _mockUpdate: mockUpdateFn,
    },
  };
});

import { db } from '../../../db/db';
const mockedDb = db as any;

describe('Truex Hook Pack Runtime', () => {
  let registry: HookPackRegistry;
  let loader: HookPackLoader;
  let upgrader: HookPackUpgrade;
  let rollback: HookPackRollback;

  beforeEach(() => {
    registry = new HookPackRegistry();
    loader = new HookPackLoader(registry);
    upgrader = new HookPackUpgrade(registry);
    rollback = new HookPackRollback(registry);
  });

  test('should load and register the volunteer pack manifest', async () => {
    await loader.load(VolunteerPackManifest);
    const manifest = registry.get('volunteer');
    expect(manifest).toBeDefined();
    expect(manifest?.version).toBe('1.0.0');
    expect(manifest?.hooks).toContain('volunteer_shortage');
  });

  test('should handle pack upgrade', async () => {
    await loader.load(VolunteerPackManifest);
    const newManifest = {
      ...VolunteerPackManifest,
      version: '1.1.0',
    };
    await upgrader.upgrade(newManifest);
    expect(registry.get('volunteer')?.version).toBe('1.1.0');
  });

  test('should rollback pack to target version', async () => {
    await loader.load(VolunteerPackManifest);
    
    // Simulate upgrade first
    const newManifest = {
      ...VolunteerPackManifest,
      version: '1.1.0',
    };
    await upgrader.upgrade(newManifest);

    // Rollback to v1.0.0
    await rollback.rollback('volunteer', '1.0.0');
    expect(registry.get('volunteer')?.version).toBe('1.0.0');
  });

  test('should spawn and execute volunteer shortage behavior from volunteer pack', async () => {
    const runtime = new HookRuntime();
    const ref: HookActorRef = {
      tenantId: 'tenant-123',
      packId: 'volunteer',
      hookId: 'volunteer_shortage',
      instanceId: 'inst-999',
    };

    const instance = await runtime.spawn(ref, volunteerShortageBehavior);
    expect(instance.state.openSlots).toBe(3);

    runtime.send(ref, {
      id: 'm1',
      type: 'graph_delta',
      payload: { action: 'cancel' },
      actorRef: ref,
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(instance.state.openSlots).toBe(4);
    expect(instance.state.shortageRatio).toBe(4 / 9);
  });

  describe('TensionQueueMapper', () => {
    let mapper: TensionQueueMapper;

    beforeEach(() => {
      mapper = new TensionQueueMapper();
      jest.clearAllMocks();

      mockedDb._mockSelect.mockReturnValue({
        from: mockedDb._mockFrom.mockReturnValue({
          where: mockedDb._mockWhereSelect,
        }),
      });

      mockedDb._mockUpdate.mockReturnValue({
        set: mockedDb._mockSet.mockReturnValue({
          where: mockedDb._mockWhereUpdate,
        }),
      });
    });

    test('should audit empty queues', async () => {
      mockedDb._mockWhereSelect.mockResolvedValue([]); // Empty for both selects

      const result = await mapper.auditTensionQueue('volunteer');
      expect(result.packName).toBe('volunteer');
      expect(result.pendingJobsCount).toBe(0);
      expect(result.jobs).toHaveLength(0);
    });

    test('should audit and filter actor_outbox and sync_queue jobs by pack name', async () => {
      const actorJobMatch = {
        id: 'job-1',
        commandId: 'cmd-1',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: JSON.stringify({
          envelope: {
            actor: {
              packId: 'volunteer',
              hookId: 'volunteer_shortage',
              instanceId: 'inst-1',
            },
          },
        }),
        status: 'pending',
      };

      const actorJobMismatch = {
        id: 'job-2',
        commandId: 'cmd-2',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: JSON.stringify({
          envelope: {
            actor: {
              packId: 'other_pack',
              hookId: 'some_hook',
              instanceId: 'inst-2',
            },
          },
        }),
        status: 'pending',
      };

      const syncJobMatch = {
        id: 101,
        jobType: 'ACTOR_RECEIPT',
        payload: JSON.stringify({
          actorRef: {
            packId: 'volunteer',
            hookId: 'volunteer_shortage',
          },
        }),
        entityId: 'volunteer',
        status: 'pending',
      };

      // Mock first select (actorOutbox) returning matched and mismatched
      mockedDb._mockWhereSelect.mockResolvedValueOnce([actorJobMatch, actorJobMismatch]);
      // Mock second select (syncQueue) returning matched
      mockedDb._mockWhereSelect.mockResolvedValueOnce([syncJobMatch]);

      const result = await mapper.auditTensionQueue('volunteer');
      expect(result.pendingJobsCount).toBe(2);
      expect(result.jobs[0].id).toBe('job-1');
      expect(result.jobs[0].source).toBe('actor_outbox');
      expect(result.jobs[1].id).toBe('101');
      expect(result.jobs[1].source).toBe('sync_queue');
    });

    test('should handle json parse errors gracefully during audit', async () => {
      const badJob = {
        id: 'job-bad',
        commandId: 'cmd-bad',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: '{invalid-json',
        status: 'pending',
      };

      mockedDb._mockWhereSelect.mockResolvedValueOnce([badJob]);
      mockedDb._mockWhereSelect.mockResolvedValueOnce([]);

      const result = await mapper.auditTensionQueue('volunteer');
      expect(result.pendingJobsCount).toBe(0);
    });

    test('should map tension queue state using rules', async () => {
      const actorJob = {
        id: 'job-1',
        commandId: 'cmd-1',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: JSON.stringify({
          envelope: {
            actor: {
              packId: 'volunteer',
              hookId: 'volunteer_shortage',
            },
            payload: {
              oldField: 'some-value',
              stableField: 'stable-value',
            },
          },
          delta: {
            add: [
              JSON.stringify({ subject: 's', predicate: 'oldPredicate', objectValue: 'o' }),
            ],
            remove: [],
          },
        }),
        status: 'pending',
      };

      const syncJob = {
        id: 101,
        jobType: 'ACTOR_RECEIPT',
        payload: JSON.stringify({
          oldField: 'sync-value',
          stableField: 'sync-stable',
          packId: 'volunteer',
        }),
        entityId: 'volunteer',
        status: 'pending',
      };

      mockedDb._mockWhereSelect.mockResolvedValueOnce([actorJob]);
      mockedDb._mockWhereSelect.mockResolvedValueOnce([syncJob]);

      mockedDb._mockWhereUpdate.mockResolvedValue({ changes: 1 });

      const mappingRules = {
        oldField: 'newField',
        oldPredicate: 'newPredicate',
      };

      const result = await mapper.mapTensionQueueState('volunteer', mappingRules);
      expect(result.success).toBe(true);
      expect(result.mappedCount).toBe(2);

      // Verify actorOutbox update payload
      const actorUpdateCall = mockedDb._mockSet.mock.calls.find((c: any) => {
        const payloadStr = c[0].payload;
        return payloadStr && payloadStr.includes('newField') && payloadStr.includes('newPredicate');
      });
      expect(actorUpdateCall).toBeDefined();

      // Verify syncQueue update payload
      const syncUpdateCall = mockedDb._mockSet.mock.calls.find((c: any) => {
        const payloadStr = c[0].payload;
        return payloadStr && payloadStr.includes('newField') && !payloadStr.includes('oldField');
      });
      expect(syncUpdateCall).toBeDefined();
    });

    test('should validate queue consistency against allowed hooks', async () => {
      const actorJobConsistent = {
        id: 'job-1',
        payload: JSON.stringify({
          envelope: {
            actor: {
              packId: 'volunteer',
              hookId: 'volunteer_shortage',
            },
          },
        }),
        status: 'pending',
      };

      const actorJobInconsistent = {
        id: 'job-2',
        payload: JSON.stringify({
          envelope: {
            actor: {
              packId: 'volunteer',
              hookId: 'deleted_hook',
            },
          },
        }),
        status: 'pending',
      };

      mockedDb._mockWhereSelect.mockResolvedValueOnce([actorJobConsistent, actorJobInconsistent]);
      mockedDb._mockWhereSelect.mockResolvedValueOnce([]);

      const result = await mapper.validateQueueConsistency('volunteer', ['volunteer_shortage']);
      expect(result.consistent).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("references hook 'deleted_hook'");
    });
  });
});
