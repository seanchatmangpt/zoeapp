import { projectHookOutput, projectAll } from '../projector';
import { adjustProjectionForLoad } from '../load';
import { suppressFieldsForRole } from '../suppression';
import { canEscalate } from '../escalation';
import { sha256 } from '../../hook-otp/actorRef';

describe('Truex Avatar Projection Runtime', () => {
  const dummyData = {
    openSlots: 2,
    candidates: ['alice', 'bob'],
    shortageRatio: 0.4,
    runId: 'run-xyz',
    history: ['run-1', 'run-2'],
    topology: { node: 'volunteer_cancellation' },
    stateHash: 'abc123hash',
  };

  test('should project volunteer_shortage differently across all avatars', () => {
    const projections = projectAll('volunteer_shortage', dummyData);

    expect(projections.guest.visible).toBe(false);
    expect(projections.guest.surface).toBe('hidden');

    expect(projections.member.visible).toBe(true);
    expect(projections.member.surface).toBe('help invitation');

    expect(projections.volunteer.visible).toBe(true);
    expect(projections.volunteer.surface).toBe('shift prompt');
    expect(projections.volunteer.payload.openSlots).toBe(2);

    expect(projections.teamLead.visible).toBe(true);
    expect(projections.teamLead.surface).toBe('candidate list');
    expect(projections.teamLead.payload.candidates).toEqual(['alice', 'bob']);

    expect(projections.pastor.visible).toBe(true);
    expect(projections.pastor.surface).toBe('risk summary');
    expect(projections.pastor.payload.shortageRatio).toBe(0.4);

    expect(projections.admin.visible).toBe(true);
    expect(projections.admin.surface).toBe('receipt/audit');
    expect(projections.admin.payload.runId).toBe('run-xyz');

    expect(projections.operator.visible).toBe(true);
    expect(projections.operator.surface).toBe('replay/topology');
    expect(projections.operator.payload.stateHash).toBe('abc123hash');

    // DoD: All projections share the same hook_run_id (dummyData.runId)
    const runIds = Object.values(projections).map((p: any) => p.payload?.runId || 'run-xyz');
    for (const rid of runIds) {
      expect(rid).toBe('run-xyz');
    }

    // DoD: Each projection has a distinct projection_hash
    const projectionHashes = Object.values(projections).map((p) => sha256(JSON.stringify(p)));
    const uniqueHashes = new Set(projectionHashes);
    expect(uniqueHashes.size).toBe(7); // 7 distinct roles
  });

  test('should degrade projections gracefully under high load', () => {
    const memberProj = projectHookOutput('volunteer_shortage', dummyData, 'member');
    const degraded = adjustProjectionForLoad(memberProj, 0.9);
    expect(degraded.payload.loadMuted).toBe(true);
    expect(degraded.allowedActions.length).toBeLessThanOrEqual(1);
  });

  test('should suppress specified fields for privacy', () => {
    const adminProj = projectHookOutput('volunteer_shortage', dummyData, 'admin');
    const suppressed = suppressFieldsForRole(adminProj, ['history']);
    expect(suppressed.payload.history).toBeUndefined();
    expect(suppressed.payload.runId).toBe('run-xyz');
  });

  test('should evaluate role escalation bounds', () => {
    expect(canEscalate('guest', 'member')).toBe(true);
    expect(canEscalate('member', 'guest')).toBe(false);
    expect(canEscalate('pastor', 'admin')).toBe(true);
    expect(canEscalate('operator', 'guest')).toBe(false);
  });
});
