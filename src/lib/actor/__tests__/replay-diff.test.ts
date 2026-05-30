import { analyzeSingleCommandReplay } from '../replayDiff';
import { CommandEnvelope, Receipt } from '../types';

describe('Replay Differential Analysis Subsystem', () => {
  const envelope: CommandEnvelope = {
    id: 'cmd-1',
    actor: { tenantId: 't1', kind: 'Sermon', id: 's1' },
    command: 'PublishSermon',
    principal: { id: 'u1', role: 'admin' },
    payload: { title: 'Grace' },
    idempotencyKey: 'idemp-1'
  };

  const allowedRoles = ['admin', 'pastor'];

  it('detects missing transitions when observed receipt is null', () => {
    const res = analyzeSingleCommandReplay(
      envelope,
      null,
      'hash_123',
      allowedRoles,
      true
    );
    expect(res).toHaveLength(1);
    expect(res[0].errorType).toBe('missing transition');
    expect(res[0].details).toContain('missing transition');
  });

  it('detects unexpected mutations when delta hashes mismatch', () => {
    const observedReceipt: Receipt = {
      id: 'rec-1',
      commandId: 'cmd-1',
      actor: envelope.actor,
      status: 'applied_remote',
      deltaHash: 'hash_different',
      eventIds: [],
      createdAt: new Date().toISOString()
    };

    const res = analyzeSingleCommandReplay(
      envelope,
      observedReceipt,
      'hash_expected',
      allowedRoles,
      true
    );
    expect(res).toHaveLength(1);
    expect(res[0].errorType).toBe('unexpected mutation');
    expect(res[0].details).toContain('unexpected mutation');
  });

  it('detects authority mismatch when role execution differs from spec', () => {
    const envelopeMember = { ...envelope, principal: { id: 'u2', role: 'member' as any } };
    const observedReceipt: Receipt = {
      id: 'rec-1',
      commandId: 'cmd-1',
      actor: envelope.actor,
      status: 'applied_remote',
      deltaHash: 'hash_ok',
      eventIds: [],
      createdAt: new Date().toISOString()
    };

    const res = analyzeSingleCommandReplay(
      envelopeMember,
      observedReceipt,
      'hash_ok',
      allowedRoles,
      true
    );
    expect(res).toHaveLength(1);
    expect(res[0].errorType).toBe('authority mismatch');
    expect(res[0].details).toContain('authority mismatch');
  });

  it('detects receipt inconsistency on replayed vs observed status/error mismatches', () => {
    const observedReceipt: Receipt = {
      id: 'rec-1',
      commandId: 'cmd-1',
      actor: envelope.actor,
      status: 'applied_remote', // Indicates success
      deltaHash: 'hash_ok',
      eventIds: [],
      createdAt: new Date().toISOString()
    };

    // Replay failed but observed succeeded
    const res = analyzeSingleCommandReplay(
      envelope,
      observedReceipt,
      'hash_ok',
      allowedRoles,
      false, // replayedSuccess is false
      'ValidationError: Invalid Title'
    );
    expect(res).toHaveLength(1);
    expect(res[0].errorType).toBe('receipt inconsistency');
    expect(res[0].details).toContain('receipt inconsistency');
  });

  it('detects causal divergence when correlation chains are broken', () => {
    const envelopeCausal = { ...envelope, causationId: 'invalid_chain' };
    const observedReceipt: Receipt = {
      id: 'rec-1',
      commandId: 'cmd-different', // Doesn't match causationId
      actor: envelope.actor,
      status: 'applied_remote',
      deltaHash: 'hash_ok',
      eventIds: [],
      createdAt: new Date().toISOString()
    };

    const res = analyzeSingleCommandReplay(
      envelopeCausal,
      observedReceipt,
      'hash_ok',
      allowedRoles,
      true
    );
    expect(res).toHaveLength(1);
    expect(res[0].errorType).toBe('causal divergence');
    expect(res[0].details).toContain('causal divergence');
  });
});
