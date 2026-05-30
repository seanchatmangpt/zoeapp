import { HookPackRegistry } from '../registry';
import { HookPackLoader } from '../loader';
import { HookPackUpgrade } from '../upgrade';
import { HookPackRollback } from '../rollback';
import { VolunteerPackManifest } from '../volunteer/manifest';
import { volunteerShortageBehavior } from '../volunteer/hooks';
import { HookRuntime } from '../../hook-otp/runtime';
import { HookActorRef } from '../../hook-otp/types';

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
});
