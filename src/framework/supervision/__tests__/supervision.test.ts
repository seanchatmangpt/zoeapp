import { AutonomicFramework } from '../index';
import { HookMessage, HookActorRef, HookBehavior } from '../../../lib/truex/hook-otp/types';
import { TensionQueueMapper } from '../../../lib/truex/packs/packs';

describe('AutonomicFramework', () => {
  let framework: AutonomicFramework;

  beforeEach(() => {
    framework = new AutonomicFramework({
      supervision: {
        maxFloodLimit: 5,
        floodWindowMs: 1000,
        maxQueueLength: 10,
        maxOscillationDepth: 3,
        maxLoadFactor: 0.85
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default parameters', () => {
      const fw = new AutonomicFramework();
      expect(fw.runtime).toBeDefined();
      expect(fw.conformance).toBeDefined();
      expect(fw.queueMapper).toBeDefined();
    });

    it('should initialize with provided config', () => {
      expect(framework.runtime).toBeDefined();
    });
  });

  describe('Actor Management', () => {
    it('should spawn an actor and allow message sending', async () => {
      const ref: HookActorRef = { tenantId: 't1', packId: 'p1', hookId: 'h1', instanceId: 'i1' };
      const behavior: HookBehavior = {
        init: async () => ({ value: 1 }),
        handleDelta: async () => []
      };

      const instance = await framework.spawnActor(ref, behavior);
      expect(instance).toBeDefined();
      expect(instance.ref).toEqual(ref);

      const msg: HookMessage = {
        id: 'msg1',
        type: 'graph_delta',
        payload: { delta: 'test' }
      };

      const result = framework.send(ref, msg);
      expect(result.success).toBe(true);
      expect(result.action).toBe('allow');
    });
  });

  describe('Message Supervision Evaluation', () => {
    it('should suppress message if flood limit is exceeded', async () => {
      const ref: HookActorRef = { tenantId: 't1', packId: 'p1', hookId: 'h1', instanceId: 'i1' };
      const behavior: HookBehavior = {
        init: async () => ({}),
      };
      
      await framework.spawnActor(ref, behavior);
      
      const msg: HookMessage = { id: 'm1', type: 'graph_delta', payload: {} };
      
      // Send 5 times to hit limit
      for (let i = 0; i < 5; i++) {
        framework.send(ref, { ...msg, id: `m${i}` });
      }
      
      // 6th message should be suppressed
      const result = framework.send(ref, { id: 'm6', type: 'graph_delta', payload: {} });
      expect(result.success).toBe(false);
      expect(result.action).toBe('suppress');
    });

    it('should quarantine message if oscillation depth is exceeded', async () => {
      const ref: HookActorRef = { tenantId: 't1', packId: 'p1', hookId: 'h1', instanceId: 'i1' };
      const behavior: HookBehavior = { init: async () => ({}) };
      
      await framework.spawnActor(ref, behavior);
      
      const msg: HookMessage = { 
        id: 'm1', 
        type: 'graph_delta', 
        actorRef: ref,
        payload: { trace: ['h1', 'h1', 'h1', 'h1'] }, // 4 visits > maxDepth 3
        causationId: 'cause_1' 
      };
      
      const result = framework.send(ref, msg);
      expect(result.success).toBe(false);
      expect(result.action).toBe('quarantine');
    });

    it('should suppress if currentLoadFactor is too high', async () => {
      const ref: HookActorRef = { tenantId: 't1', packId: 'p1', hookId: 'h1', instanceId: 'i1' };
      const behavior: HookBehavior = { init: async () => ({}) };
      await framework.spawnActor(ref, behavior);

      const msg: HookMessage = { id: 'load_m1', type: 'graph_delta', payload: {} };
      
      const result = framework.send(ref, msg, 0.90); // 0.90 > 0.85 (default maxLoadFactor)
      expect(result.success).toBe(false);
      expect(result.action).toBe('suppress');
    });
  });

  describe('Tension Queue Wrappers', () => {
    it('should proxy auditPackTension to TensionQueueMapper', async () => {
      const mockResult = { packName: 'test_pack', pendingJobsCount: 0, jobs: [] };
      jest.spyOn(TensionQueueMapper.prototype, 'auditTensionQueue').mockResolvedValue(mockResult);

      const result = await framework.auditPackTension('test_pack');
      expect(result).toEqual(mockResult);
      expect(TensionQueueMapper.prototype.auditTensionQueue).toHaveBeenCalledWith('test_pack');
    });

    it('should proxy mapPackTensionQueue to TensionQueueMapper', async () => {
      const mockResult = { success: true, mappedCount: 1, details: [] };
      jest.spyOn(TensionQueueMapper.prototype, 'mapTensionQueueState').mockResolvedValue(mockResult);

      const rules = { oldProp: 'newProp' };
      const result = await framework.mapPackTensionQueue('test_pack', rules);
      expect(result).toEqual(mockResult);
      expect(TensionQueueMapper.prototype.mapTensionQueueState).toHaveBeenCalledWith('test_pack', rules);
    });
  });

  describe('Trace Conformance Evaluation', () => {
    it('should proxy evaluateTrace to SupervisionProcessConformanceEvaluator', () => {
      const declared = ['A', 'B', 'C'];
      const actual = ['A', 'B', 'C'];

      const result = framework.evaluateTrace(declared, actual);
      expect(result.isConforming).toBe(true);
      expect(result.fitness).toBe(1.0);
    });

    it('should identify deviations in trace conformance', () => {
      const declared = ['A', 'B'];
      const actual = ['A', 'C', 'B']; // Undeclared transition A->C and C->B

      const result = framework.evaluateTrace(declared, actual);
      expect(result.isConforming).toBe(false);
      expect(result.deviations.length).toBeGreaterThan(0);
    });
  });
});
