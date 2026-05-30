import { MembraneContext } from '../context';
import { Interceptors } from '../interceptors';
import { Receipts } from '../receipts';
import { ProxyableBridge } from '../proxyableBridge';
import { SimulationContext } from '../simulation';

describe('Universal Operational Membrane', () => {
  beforeEach(() => {
    Receipts.clear();
    Interceptors.clear();
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
});
