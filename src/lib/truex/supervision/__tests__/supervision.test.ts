import { HookMessage, HookActorRef } from '../../hook-otp/types';
import { FloodSupervisor } from '../floodSupervisor';
import { PressureSupervisor } from '../pressure';
import { OscillationSupervisor } from '../oscillation';
import { AvatarLoadSupervisor } from '../avatarLoad';
import { HookMailbox } from '../../hook-otp/mailbox';
import { HookActorInstance } from '../../hook-otp/registry';
import { quarantineActor } from '../quarantine';
import { repairActor } from '../repair';

describe('Truex Hook OTP Supervision', () => {
  const actorRef: HookActorRef = {
    tenantId: 'tenant-1',
    packId: 'volunteer-pack',
    hookId: 'volunteer_cancellation',
    instanceId: 'inst-1',
  };

  test('should suppress messages under notification flood', () => {
    const supervisor = new FloodSupervisor(3, 100);
    const msg = (id: string): HookMessage => ({
      id,
      type: 'graph_delta',
      payload: {},
      actorRef,
      timestamp: new Date().toISOString(),
    });

    expect(supervisor.recordAndCheck(msg('m1'))).toBe('allow');
    expect(supervisor.recordAndCheck(msg('m2'))).toBe('allow');
    expect(supervisor.recordAndCheck(msg('m3'))).toBe('allow');
    expect(supervisor.recordAndCheck(msg('m4'))).toBe('suppress');
  });

  test('should trigger batching under high queue pressure', async () => {
    const supervisor = new PressureSupervisor(2);
    let resolveProcessor: any;
    const mailbox = new HookMailbox(async () => {
      await new Promise((resolve) => {
        resolveProcessor = resolve;
      });
    });

    expect(supervisor.checkPressure(mailbox)).toBe('allow');

    const msg = (): HookMessage => ({
      id: 'm',
      type: 'graph_delta',
      payload: {},
      actorRef,
      timestamp: new Date().toISOString(),
    });

    mailbox.push(msg()); // This starts processing and blocks
    mailbox.push(msg()); // Queued
    mailbox.push(msg()); // Queued
    mailbox.push(msg()); // Queued

    expect(supervisor.checkPressure(mailbox)).toBe('batch');
    
    // Cleanup/unblock
    if (resolveProcessor) resolveProcessor();
  });

  test('should quarantine actor under circular message oscillation', () => {
    const supervisor = new OscillationSupervisor(2);

    const msgWithTrace = (trace: string[]): HookMessage => ({
      id: 'm-trace',
      type: 'graph_delta',
      payload: { trace },
      actorRef,
      timestamp: new Date().toISOString(),
    });

    expect(supervisor.detectOscillation(msgWithTrace(['volunteer_cancellation']))).toBe('allow');
    expect(
      supervisor.detectOscillation(
        msgWithTrace(['volunteer_cancellation', 'other_hook', 'volunteer_cancellation'])
      )
    ).toBe('allow');
    expect(
      supervisor.detectOscillation(
        msgWithTrace([
          'volunteer_cancellation',
          'other_hook',
          'volunteer_cancellation',
          'other_hook2',
          'volunteer_cancellation',
          'volunteer_cancellation',
        ])
      )
    ).toBe('quarantine');
  });

  test('should suppress views under high avatar load', () => {
    const supervisor = new AvatarLoadSupervisor(0.9);
    expect(supervisor.checkLoad(0.5)).toBe('allow');
    expect(supervisor.checkLoad(0.95)).toBe('suppress');
  });

  test('should transition actor state through quarantine and repair', () => {
    const mailbox = new HookMailbox(async () => {});
    const mockInstance: HookActorInstance = {
      ref: actorRef,
      state: { data: 'old_data' },
      mailbox,
      behavior: {},
      supervisor: { onFailure: async () => 'restart' },
      quarantined: false,
      history: [],
      receiptChainHash: 'init',
    };

    quarantineActor(mockInstance, 'Replay divergence detected');
    expect(mockInstance.quarantined).toBe(true);
    expect(mockInstance.state.quarantineReason).toBe('Replay divergence detected');
    expect(mockInstance.state.quarantinedAt).toBeDefined();

    repairActor(mockInstance, { data: 'repaired_data' });
    expect(mockInstance.quarantined).toBe(false);
    expect(mockInstance.state).toEqual({ data: 'repaired_data' });
  });
});
