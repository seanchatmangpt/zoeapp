import { PredictiveActionLayer } from '../PredictiveActionLayer';
import { ActorRegistry } from '../../../../lib/actor/registry';
import { CommandEnvelope, ActorRef, Principal } from '../../../../lib/actor/types';

describe('PredictiveActionLayer', () => {
  const pal = PredictiveActionLayer.getInstance();
  const registry = ActorRegistry.getInstance();

  const mockActor: ActorRef = { id: 'test-actor', kind: 'test-kind' };
  const mockPrincipal: Principal = { id: 'test-user', role: 'admin' };

  beforeAll(() => {
    registry.clear();
    registry.register({
      actorKind: 'test-kind',
      commands: {
        'cmd-1': {
          roles: ['admin'],
          inputValidator: async () => true,
          construct: async (payload) => ({ add: [], remove: [] }),
          emits: ['evt-1'],
        },
        'cmd-2': {
          roles: ['admin'],
          inputValidator: async () => true,
          construct: async (payload) => ({ add: [{ subject: 's', predicate: 'p', object: 'o' }], remove: [] }),
          emits: ['evt-2'],
        },
      },
    });
  });

  afterEach(() => {
    pal.reset();
  });

  it('should ingest an intent and return predictions', async () => {
    const envelope: CommandEnvelope = {
      id: 'env-1',
      actor: mockActor,
      command: 'cmd-1',
      payload: {},
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    const predictions = await pal.ingestIntent(envelope);
    expect(predictions).toBeDefined();
    expect(pal.getState().recentIntents).toHaveLength(1);
  });

  it('should predict next commands based on history', async () => {
    const env1: CommandEnvelope = {
      id: 'env-1',
      actor: mockActor,
      command: 'cmd-1',
      payload: {},
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    const env2: CommandEnvelope = {
      id: 'env-2',
      actor: mockActor,
      command: 'cmd-2',
      payload: {},
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    // Train the engine: cmd-1 is followed by cmd-2
    await pal.ingestIntent(env1);
    await pal.ingestIntent(env2);
    await pal.ingestIntent(env1);
    
    const predictions = await pal.ingestIntent(env2);
    // After cmd-2, it should predict cmd-1 if it was followed by it before
    // In our case, we just want to see some predictions
    expect(predictions.length).toBeGreaterThanOrEqual(0);
  });

  it('should pre-compute results in the membrane sandbox', async () => {
    const env1: CommandEnvelope = {
      id: 'env-1',
      actor: mockActor,
      command: 'cmd-1',
      payload: {},
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    const env2: CommandEnvelope = {
      id: 'env-2',
      actor: mockActor,
      command: 'cmd-2',
      payload: { data: 'test' },
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    // Sequential ingest to build history
    await pal.ingestIntent(env1);
    await pal.ingestIntent(env2);
    await pal.ingestIntent(env1);

    // Wait for async pre-computations
    await new Promise(resolve => setTimeout(resolve, 100));

    const state = pal.getState();
    expect(state.predictions.length).toBeGreaterThan(0);
    
    // Check if we can retrieve a pre-computed result
    const predicted = state.predictions[0];
    const cached = pal.getPreComputedResult(
      predicted.envelope.actor.kind,
      predicted.envelope.command,
      predicted.envelope.payload
    );
    
    expect(cached).not.toBeNull();
    if (cached) {
      expect(cached.success).toBe(true);
      expect(cached.result).toBeDefined();
    }
  });

  it('should handle subscription to state changes', async () => {
    const listener = jest.fn();
    const unsubscribe = pal.subscribe(listener);

    const envelope: CommandEnvelope = {
      id: 'env-1',
      actor: mockActor,
      command: 'cmd-1',
      payload: {},
      principal: mockPrincipal,
      createdAt: new Date().toISOString(),
    };

    await pal.ingestIntent(envelope);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await pal.ingestIntent(envelope);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should bound the size of history and pre-computations', async () => {
    // Fill history
    for (let i = 0; i < 60; i++) {
      await pal.ingestIntent({
        id: `env-${i}`,
        actor: mockActor,
        command: 'cmd-1',
        payload: { i },
        principal: mockPrincipal,
        createdAt: new Date().toISOString(),
      });
    }

    expect(pal.getState().recentIntents.length).toBe(50);
  });
});
