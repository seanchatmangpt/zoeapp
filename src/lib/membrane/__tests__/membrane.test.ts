import { MembraneContext } from '../context';
import { Interceptors } from '../interceptors';
import { Receipts } from '../receipts';
import { ProxyableBridge } from '../proxyableBridge';
import { SimulationContext } from '../simulation';
import { Ontology } from '../ontology';
import { ReplayEvaluator } from '../replay';
import { Quarantine } from '../quarantine';
import { Trajectories } from '../trajectories';

describe('Universal Operational Membrane', () => {
  beforeEach(() => {
    Receipts.clear();
    Interceptors.clear();
    Quarantine.clear();
  });

  it('allows execution when interceptors observe/allow', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    const executionBlock = jest.fn().mockResolvedValue('success_output');

    const result = await context.run('test-capability', 'cmd-1', {}, executionBlock);

    expect(result.success).toBe(true);
    expect(result.result).toBe('success_output');
    expect(result.receipt.verdict).toBe('allow');
    expect(executionBlock).toHaveBeenCalled();
  });

  it('denies execution when authority is unauthorized', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'anonymous' // Unauthorized
    });

    const executionBlock = jest.fn();

    const result = await context.run('test-capability', 'cmd-1', {}, executionBlock);

    expect(result.success).toBe(false);
    expect(result.result).toBeNull();
    expect(result.receipt.verdict).toBe('deny');
    expect(executionBlock).not.toHaveBeenCalled();
  });

  it('traps mutations and enforces trajectory constraints using ProxyableBridge', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    const targetObject = {
      state: 'idle'
    };

    // Wrap object in proxy membrane governed by SermonFlow
    const proxy = ProxyableBridge.wrap(targetObject, context, {
      flowName: 'SermonFlow'
    });

    // 1. Legal transition: idle -> drafted (allowed in SermonFlow)
    proxy.state = 'drafted';
    expect(proxy.state).toBe('drafted');

    // 2. Illegal transition: drafted -> published (needs reviewed state first)
    // The membrane should reject and quarantine the write
    const writeResult = await context.run('property-mutator', 'cmd-2', {
      flowName: 'SermonFlow',
      fromState: 'drafted',
      toState: 'published'
    }, async () => {
      proxy.state = 'published';
      return true;
    });

    expect(writeResult.success).toBe(false);
    expect(writeResult.error).toContain('Illegal trajectory transition');
  });

  it('runs speculative counterfactual dry-runs using SimulationContext without mutating base state', async () => {
    const baseState = {
      volunteersCount: 10,
      serviceHour: '9am'
    };

    const sim = new SimulationContext(baseState);

    const simulationResult = await sim.simulateRun('cmd-sim-1', {}, async (state) => {
      state.volunteersCount = 12;
      state.serviceHour = '10am';
      return 'simulation_complete';
    });

    expect(simulationResult.success).toBe(true);
    expect(simulationResult.result).toBe('simulation_complete');
    expect(simulationResult.drift).toBe(true); // State has drifted

    // Verify base state was not mutated
    expect(baseState.volunteersCount).toBe(10);
    expect(baseState.serviceHour).toBe('9am');

    // Verify speculative state was mutated
    expect(sim.getSpeculativeState().volunteersCount).toBe(12);
  });

  it('quarantines execution block and emits refusal receipt when it throws an error', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    const failingBlock = async () => {
      throw new Error('Database connection failed');
    };

    const result = await context.run('failing-cap', 'cmd-fail-123', { payloadData: 42 }, failingBlock);

    expect(result.success).toBe(false);
    expect(result.result).toBeNull();
    expect(result.error).toBe('Database connection failed');
    expect(result.receipt.verdict).toBe('deny');
    expect(result.receipt.success).toBe(false);

    // Verify it is isolated in Quarantine
    const records = Quarantine.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].commandId).toBe('cmd-fail-123');
    expect(records[0].error).toBe('Database connection failed');
    expect(records[0].payload).toEqual({ payloadData: 42 });
  });

  it('calls onMutation callback on proxy state set and rolls back on illegal transition', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    const target = { state: 'idle' };
    const mutations: { prop: string | symbol; val: any }[] = [];
    const proxy = ProxyableBridge.wrap(target, context, {
      flowName: 'SermonFlow',
      onMutation: (prop, value) => {
        mutations.push({ prop, val: value });
      }
    });

    // Valid mutation
    proxy.state = 'drafted';
    expect(proxy.state).toBe('drafted');
    expect(mutations).toEqual([{ prop: 'state', val: 'drafted' }]);

    // Invalid mutation (drafted -> published is illegal in SermonFlow)
    proxy.state = 'published';
    // Wait for the background context.run check and rollback to execute
    await new Promise(resolve => setTimeout(resolve, 15));
    expect(proxy.state).toBe('drafted'); // Rolled back!
  });

  it('registers custom interceptors and handles fork/deny verdicts', async () => {
    const denyInterceptor = jest.fn().mockResolvedValue(false);
    Interceptors.register(denyInterceptor);

    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    const result = await context.run('custom-cap', 'cmd-custom-1', { data: 'test' }, async () => 'ok');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Denied by membrane');
    expect(denyInterceptor).toHaveBeenCalled();

    // Test speculative simulation tag (fork verdict)
    Interceptors.clear();
    const resultFork = await context.run('custom-cap', 'cmd-speculative', { __speculative: true }, async () => 'ok');
    expect(resultFork.receipt.verdict).toBe('fork');
  });

  it('validates predicates and verifies ontology drift', () => {
    // Predicate validation tests
    expect(Ontology.isPredicateValid('http://schema.org/name')).toBe(true);
    expect(Ontology.isPredicateValid('urn:zoe:sermon')).toBe(true);
    expect(Ontology.isPredicateValid('https://invalid.com/custom')).toBe(false);

    // Drift verification tests
    const v1 = { name: 'TrueX', role: 'membrane' };
    const v2Stable = { name: 'TrueX', role: 'membrane' };
    const v2Drift = { name: 'TrueX_Drifted', role: 'membrane' };

    const mappingRules = { name: 'name', role: 'role' };

    expect(Ontology.verifyOntologyDrift(v1, v2Stable, mappingRules).stable).toBe(true);

    const driftRes = Ontology.verifyOntologyDrift(v1, v2Drift, mappingRules);
    expect(driftRes.stable).toBe(false);
    expect(driftRes.driftDetails).toContain("Missing or drifted predicate mapping for key 'name'");
  });

  it('retrieves receipt history and validates chain lineage continuity', async () => {
    const context = new MembraneContext({
      mode: 'strict',
      tenantId: 'tenant-1',
      authorityRole: 'admin'
    });

    await context.run('cap-1', 'cmd-c1', {}, async () => 'ok');
    await context.run('cap-2', 'cmd-c2', {}, async () => 'ok');

    const history = Receipts.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].commandId).toBe('cmd-c1');
    expect(history[1].commandId).toBe('cmd-c2');

    // Valid chain lineage
    const validation = Receipts.validateChain(history);
    expect(validation.valid).toBe(true);

    // Invalid chain lineage (modify previousHash to break chain)
    const brokenHistory = JSON.parse(JSON.stringify(history));
    brokenHistory[1].previousHash = 'corrupted_hash';
    const brokenValidation = Receipts.validateChain(brokenHistory);
    expect(brokenValidation.valid).toBe(false);
    expect(brokenValidation.error).toContain('broken lineage at index 1');
  });

  it('replays a sequence of actions over state and produces a deterministic hash', async () => {
    const initialState = { counter: 0 };
    const inputs = [
      { type: 'increment', value: 2 },
      { type: 'increment', value: 5 },
      { type: 'decrement', value: 1 }
    ];

    const dispatch = async (state: typeof initialState, input: typeof inputs[0]) => {
      const newState = { ...state };
      if (input.type === 'increment') {
        newState.counter += input.value;
      } else if (input.type === 'decrement') {
        newState.counter -= input.value;
      }
      return newState;
    };

    const replayResult = await ReplayEvaluator.replay(inputs, initialState, dispatch);
    expect(replayResult.finalState.counter).toBe(6);
    expect(replayResult.canonicalHash).toBeDefined();
    expect(typeof replayResult.canonicalHash).toBe('string');
  });

  it('handles edge cases in state transitions validation', () => {
    // Non-existent flow
    expect(Trajectories.validateTransition('NonExistentFlow', 'idle', 'drafted')).toBe(false);

    // Non-existent source state
    expect(Trajectories.validateTransition('SermonFlow', 'invalid_state', 'drafted')).toBe(false);

    // Invalid target state
    expect(Trajectories.validateTransition('SermonFlow', 'published', 'drafted')).toBe(false);
  });
});
