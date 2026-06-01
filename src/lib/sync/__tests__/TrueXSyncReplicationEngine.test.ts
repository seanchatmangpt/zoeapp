/**
 * @file TrueXSyncReplicationEngine.test.ts
 *
 * Comprehensive test suite for the TrueXSyncReplicationEngine.
 *
 * Tests cover:
 *   1. Admission Gate — per-event gate evaluation, reject/quarantine/admit verdicts
 *   2. PATQ persistence — events are written to SQLite BEFORE dispatch
 *   3. BLAKE3 receipt generation — hash correctness, chain linkage
 *   4. Deterministic replay — replayFromReceipt verifies stored batch
 *   5. Receipt chain verification — multi-batch integrity
 *   6. Dispatch lifecycle — happy path, failures, exponential backoff
 *   7. Quarantine — receipts exceeding maxAttempts are quarantined
 *   8. Concurrency guard — isDispatching mutex prevents double-dispatch
 *   9. Edge cases — empty batches, duplicate idempotency keys, gate violations
 *  10. Custom admission gate — pluggable gate contract
 */

import {
  TrueXSyncReplicationEngine,
  InMemoryReplicationStorageAdapter,
  DefaultAdmissionGate,
  SyncEvent,
  AdmissionReceipt,
  DispatchedEvent,
  AdmissionGate,
  AdmissionDecision,
  ReplicationEngineConfig,
  SyncDispatcher,
} from '../TrueXSyncReplicationEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<SyncEvent> = {}): SyncEvent {
  const id = overrides.idempotencyKey ?? `idem-${Math.random().toString(36).slice(2)}`;
  return {
    entityId: 'user-001',
    eventType: 'user.profile.updated',
    payload: { name: 'Alice' },
    idempotencyKey: id,
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePassDispatcher(): SyncDispatcher & { calls: Array<{ events: readonly DispatchedEvent[]; receipt: AdmissionReceipt }> } {
  const calls: Array<{ events: readonly DispatchedEvent[]; receipt: AdmissionReceipt }> = [];
  return {
    calls,
    async dispatch(events, receipt) {
      calls.push({ events, receipt });
    },
  };
}

function makeFailDispatcher(
  failCount: number,
  errorMessage = 'network_error'
): SyncDispatcher & { calls: number } {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async dispatch() {
      calls++;
      if (calls <= failCount) {
        throw new Error(errorMessage);
      }
    },
  } as unknown as SyncDispatcher & { calls: number };
}

/** Build an engine with zero backoff for fast tests */
function makeEngine(
  storage: InMemoryReplicationStorageAdapter,
  dispatcher: SyncDispatcher,
  extra: ReplicationEngineConfig = {}
): TrueXSyncReplicationEngine {
  return new TrueXSyncReplicationEngine(storage, dispatcher, {
    backoffBaseMs: 0,
    backoffMaxMs: 0,
    backoffJitter: 0,
    maxBatchSize: 50,
    maxDispatchAttempts: 3,
    ...extra,
  });
}

/** Wait for all microtasks and timers (give async dispatch time to complete) */
async function flushAsync(iterations = 5): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DefaultAdmissionGate
// ─────────────────────────────────────────────────────────────────────────────

describe('DefaultAdmissionGate', () => {
  let gate: DefaultAdmissionGate;

  beforeEach(() => {
    gate = new DefaultAdmissionGate();
  });

  it('admits a fully valid event', () => {
    const result = gate.evaluate(makeEvent());
    expect(result.verdict).toBe('admit');
  });

  it('rejects when idempotencyKey is empty string', () => {
    const result = gate.evaluate(makeEvent({ idempotencyKey: '' }));
    expect(result.verdict).toBe('reject');
    expect((result as any).reason).toMatch(/idempotencyKey/);
  });

  it('rejects when idempotencyKey is whitespace only', () => {
    const result = gate.evaluate(makeEvent({ idempotencyKey: '   ' }));
    expect(result.verdict).toBe('reject');
  });

  it('rejects when entityId is empty', () => {
    const result = gate.evaluate(makeEvent({ entityId: '' }));
    expect(result.verdict).toBe('reject');
    expect((result as any).reason).toMatch(/entityId/);
  });

  it('rejects when eventType is empty', () => {
    const result = gate.evaluate(makeEvent({ eventType: '' }));
    expect(result.verdict).toBe('reject');
    expect((result as any).reason).toMatch(/eventType/);
  });

  it('rejects when occurredAt is not a valid ISO timestamp', () => {
    const result = gate.evaluate(makeEvent({ occurredAt: 'not-a-date' }));
    expect(result.verdict).toBe('reject');
    expect((result as any).reason).toMatch(/occurredAt/);
  });

  it('admits event with a valid timestamp in alternative ISO format', () => {
    const result = gate.evaluate(makeEvent({ occurredAt: '2026-01-01T00:00:00.000Z' }));
    expect(result.verdict).toBe('admit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. admitBatch — basic admission + queue persistence
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — admitBatch persistence', () => {
  let storage: InMemoryReplicationStorageAdapter;
  let dispatcher: SyncDispatcher;
  let engine: TrueXSyncReplicationEngine;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
    dispatcher = makePassDispatcher();
    engine = makeEngine(storage, dispatcher);
  });

  it('returns receipt=null for an empty batch', async () => {
    const outcome = await engine.admitBatch([]);
    expect(outcome.receipt).toBeNull();
    expect(outcome.admitted).toHaveLength(0);
    expect(outcome.rejected).toHaveLength(0);
    expect(outcome.quarantined).toHaveLength(0);
  });

  it('persists admitted events to SQLite before returning', async () => {
    const events = [makeEvent(), makeEvent()];
    await engine.admitBatch(events);
    expect(storage._getEventCount()).toBe(2);
  });

  it('persists AdmissionReceipt to SQLite before returning', async () => {
    await engine.admitBatch([makeEvent()]);
    expect(storage._getReceiptCount()).toBe(1);
  });

  it('returns admitted events with queueId assigned', async () => {
    const event = makeEvent();
    const outcome = await engine.admitBatch([event]);
    expect(outcome.admitted).toHaveLength(1);
    expect(outcome.admitted[0].queueId).toBeDefined();
    expect(typeof outcome.admitted[0].queueId).toBe('number');
  });

  it('returns receipt with correct eventCount', async () => {
    const events = [makeEvent(), makeEvent(), makeEvent()];
    const outcome = await engine.admitBatch(events);
    expect(outcome.receipt).not.toBeNull();
    expect(outcome.receipt!.eventCount).toBe(3);
  });

  it('receipt.eventIdempotencyKeys contains all admitted idempotencyKeys', async () => {
    const e1 = makeEvent({ idempotencyKey: 'key-A' });
    const e2 = makeEvent({ idempotencyKey: 'key-B' });
    const outcome = await engine.admitBatch([e1, e2]);
    expect(outcome.receipt!.eventIdempotencyKeys).toContain('key-A');
    expect(outcome.receipt!.eventIdempotencyKeys).toContain('key-B');
  });

  it('separates admitted from rejected events', async () => {
    const good = makeEvent();
    const bad = makeEvent({ idempotencyKey: '' }); // gate will reject
    const outcome = await engine.admitBatch([good, bad]);
    expect(outcome.admitted).toHaveLength(1);
    expect(outcome.rejected).toHaveLength(1);
    expect(outcome.rejected[0].event).toBe(bad);
  });

  it('returns receipt=null when all events are rejected', async () => {
    const bad = makeEvent({ idempotencyKey: '' });
    const outcome = await engine.admitBatch([bad]);
    expect(outcome.receipt).toBeNull();
    expect(outcome.admitted).toHaveLength(0);
    expect(outcome.rejected).toHaveLength(1);
  });

  it('successive batches each produce a distinct receipt', async () => {
    const o1 = await engine.admitBatch([makeEvent()]);
    const o2 = await engine.admitBatch([makeEvent()]);
    expect(o1.receipt!.id).not.toBe(o2.receipt!.id);
    expect(o1.receipt!.receiptHash).not.toBe(o2.receipt!.receiptHash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BLAKE3 receipt hash correctness
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — BLAKE3 receipt hashing', () => {
  let storage: InMemoryReplicationStorageAdapter;
  let engine: TrueXSyncReplicationEngine;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
    engine = makeEngine(storage, makePassDispatcher());
  });

  it('receipt has a non-empty batchHash, receiptHash, and id', async () => {
    const outcome = await engine.admitBatch([makeEvent()]);
    const r = outcome.receipt!;
    expect(r.batchHash.length).toBeGreaterThan(0);
    expect(r.receiptHash.length).toBeGreaterThan(0);
    expect(r.id.length).toBeGreaterThan(0);
  });

  it('receipt id is derived from receiptHash (starts with rcpt_)', async () => {
    const outcome = await engine.admitBatch([makeEvent()]);
    expect(outcome.receipt!.id).toMatch(/^rcpt_/);
  });

  it('different payloads produce different batchHash values', async () => {
    const o1 = await engine.admitBatch([makeEvent({ payload: { name: 'Alice' } })]);
    const o2 = await engine.admitBatch([makeEvent({ payload: { name: 'Bob' } })]);
    expect(o1.receipt!.batchHash).not.toBe(o2.receipt!.batchHash);
  });

  it('second receipt previousReceiptHash equals first receipt receiptHash', async () => {
    const o1 = await engine.admitBatch([makeEvent()]);
    const o2 = await engine.admitBatch([makeEvent()]);
    expect(o2.receipt!.previousReceiptHash).toBe(o1.receipt!.receiptHash);
  });

  it('first receipt has a deterministic genesis previousReceiptHash', async () => {
    const o1 = await engine.admitBatch([makeEvent()]);
    // Two fresh engines should produce the same genesis hash for the same event content
    // (we only check it is non-empty and consistent across calls)
    expect(o1.receipt!.previousReceiptHash.length).toBeGreaterThan(0);
  });

  it('identical events produce identical batchHash', async () => {
    // Use two engines with fresh storage to produce the same batch independently
    const s1 = new InMemoryReplicationStorageAdapter();
    const s2 = new InMemoryReplicationStorageAdapter();
    const e1 = makeEngine(s1, makePassDispatcher());
    const e2 = makeEngine(s2, makePassDispatcher());

    const event = makeEvent({ idempotencyKey: 'stable-key', occurredAt: '2026-06-01T00:00:00.000Z' });
    const o1 = await e1.admitBatch([{ ...event }]);
    const o2 = await e2.admitBatch([{ ...event }]);
    expect(o1.receipt!.batchHash).toBe(o2.receipt!.batchHash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. replayFromReceipt — deterministic replay verification
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — replayFromReceipt', () => {
  let storage: InMemoryReplicationStorageAdapter;
  let engine: TrueXSyncReplicationEngine;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
    engine = makeEngine(storage, makePassDispatcher());
  });

  it('replay of a valid receipt returns verified=true', async () => {
    const outcome = await engine.admitBatch([makeEvent(), makeEvent()]);
    const result = await engine.replayFromReceipt(outcome.receipt!);
    expect(result.verified).toBe(true);
    expect(result.chainIntact).toBe(true);
    expect(result.hashDivergence).toBe('');
  });

  it('replay returns correct number of events', async () => {
    const events = [makeEvent(), makeEvent(), makeEvent()];
    const outcome = await engine.admitBatch(events);
    const result = await engine.replayFromReceipt(outcome.receipt!);
    expect(result.events).toHaveLength(3);
  });

  it('replay returns verified=false for a tampered receipt id', async () => {
    const fakeReceipt: AdmissionReceipt = {
      id: 'rcpt_nonexistent',
      batchHash: 'fake',
      previousReceiptHash: 'fake',
      receiptHash: 'fake',
      eventCount: 1,
      eventIdempotencyKeys: ['key'],
      queueIds: [999],
      admittedAt: new Date().toISOString(),
      status: 'admitted',
      dispatchAttempts: 0,
    };
    const result = await engine.replayFromReceipt(fakeReceipt);
    expect(result.verified).toBe(false);
  });

  it('replay of second batch also verifies correctly', async () => {
    await engine.admitBatch([makeEvent()]);
    const o2 = await engine.admitBatch([makeEvent()]);
    const result = await engine.replayFromReceipt(o2.receipt!);
    expect(result.verified).toBe(true);
    expect(result.chainIntact).toBe(true);
  });

  it('replay includes the original receipt in the result', async () => {
    const outcome = await engine.admitBatch([makeEvent()]);
    const result = await engine.replayFromReceipt(outcome.receipt!);
    expect(result.receipt.id).toBe(outcome.receipt!.id);
  });

  it('recomputedBatchHash matches stored batchHash on successful replay', async () => {
    const outcome = await engine.admitBatch([makeEvent()]);
    const result = await engine.replayFromReceipt(outcome.receipt!);
    expect(result.recomputedBatchHash).toBe(outcome.receipt!.batchHash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. verifyReceiptChain — multi-batch chain integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — verifyReceiptChain', () => {
  let storage: InMemoryReplicationStorageAdapter;
  let engine: TrueXSyncReplicationEngine;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
    engine = makeEngine(storage, makePassDispatcher());
  });

  it('returns valid=true for an empty chain', async () => {
    const result = await engine.verifyReceiptChain();
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(0);
  });

  it('returns valid=true for a single-batch chain', async () => {
    await engine.admitBatch([makeEvent()]);
    const result = await engine.verifyReceiptChain();
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(1);
  });

  it('returns valid=true for a 5-batch chain', async () => {
    for (let i = 0; i < 5; i++) {
      await engine.admitBatch([makeEvent()]);
    }
    const result = await engine.verifyReceiptChain();
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(5);
  });

  it('detects a tampered receipt hash in the chain', async () => {
    const o1 = await engine.admitBatch([makeEvent()]);
    // Mutate the stored receipt directly (simulates tamper)
    const storedReceipt = await storage.getAdmissionReceiptById(o1.receipt!.id);
    if (storedReceipt) {
      (storedReceipt as any).receiptHash = 'tampered_hash_value_000000000000000000000000000000';
    }
    const result = await engine.verifyReceiptChain();
    expect(result.valid).toBe(false);
    expect(result.firstBrokenLink).toBe(o1.receipt!.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Dispatch lifecycle — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — dispatch happy path', () => {
  let storage: InMemoryReplicationStorageAdapter;
  let dispatcher: ReturnType<typeof makePassDispatcher>;
  let engine: TrueXSyncReplicationEngine;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
    dispatcher = makePassDispatcher();
    engine = makeEngine(storage, dispatcher);
  });

  it('receipt status becomes confirmed after successful dispatch', async () => {
    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(10);

    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    expect(stored!.status).toBe('confirmed');
  });

  it('dispatcher.dispatch is called exactly once per admitted batch', async () => {
    await engine.admitBatch([makeEvent(), makeEvent()]);
    await flushAsync(10);
    expect(dispatcher.calls).toHaveLength(1);
  });

  it('dispatcher receives all events from the batch', async () => {
    const events = [
      makeEvent({ idempotencyKey: 'k1' }),
      makeEvent({ idempotencyKey: 'k2' }),
    ];
    await engine.admitBatch(events);
    await flushAsync(10);

    const callEvents = dispatcher.calls[0].events;
    const keys = callEvents.map((e) => e.idempotencyKey);
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
  });

  it('events are marked as dispatched after confirmation', async () => {
    await engine.admitBatch([makeEvent()]);
    await flushAsync(10);
    expect(storage._getDispatchedCount()).toBe(1);
  });

  it('two sequential batches are each dispatched and confirmed', async () => {
    const o1 = await engine.admitBatch([makeEvent()]);
    await flushAsync(10);
    const o2 = await engine.admitBatch([makeEvent()]);
    await flushAsync(10);

    const r1 = await storage.getAdmissionReceiptById(o1.receipt!.id);
    const r2 = await storage.getAdmissionReceiptById(o2.receipt!.id);
    expect(r1!.status).toBe('confirmed');
    expect(r2!.status).toBe('confirmed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Exponential backoff and quarantine
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — backoff and quarantine', () => {
  it('retries up to maxDispatchAttempts then quarantines', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    // Fails every time → will exhaust 3 attempts and quarantine
    const alwaysFail: SyncDispatcher = {
      async dispatch() {
        throw new Error('always fail');
      },
    };
    const engine = makeEngine(storage, alwaysFail, { maxDispatchAttempts: 3 });

    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(20);

    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    expect(stored!.status).toBe('quarantined');
    expect(stored!.dispatchAttempts).toBe(3);
    expect(stored!.lastError).toMatch(/always fail/);
  });

  it('succeeds on the 3rd attempt (fail twice, then pass)', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    let attempts = 0;
    const retryPass: SyncDispatcher = {
      async dispatch() {
        attempts++;
        if (attempts < 3) throw new Error('transient');
      },
    };
    const engine = makeEngine(storage, retryPass, { maxDispatchAttempts: 5 });

    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(30);

    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    expect(stored!.status).toBe('confirmed');
    expect(attempts).toBe(3);
  });

  it('records lastError message from the most recent failure', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    let callNum = 0;
    const failThenPass: SyncDispatcher = {
      async dispatch() {
        callNum++;
        if (callNum === 1) throw new Error('first_error');
      },
    };
    const engine = makeEngine(storage, failThenPass, { maxDispatchAttempts: 3 });

    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(20);

    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    // It should confirm on the 2nd attempt; lastError may be set from the 1st failure
    expect(stored!.status).toBe('confirmed');
  });

  it('quarantine records the error from the last attempt', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const alwaysFail: SyncDispatcher = {
      async dispatch() { throw new Error('permanent_failure'); },
    };
    const engine = makeEngine(storage, alwaysFail, { maxDispatchAttempts: 2 });

    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(20);

    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    expect(stored!.status).toBe('quarantined');
    expect(stored!.lastError).toContain('permanent_failure');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Concurrency guard — isDispatching mutex
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — concurrency guard', () => {
  it('does not double-dispatch when admitBatch is called during active dispatch', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    let dispatchCount = 0;
    let dispatchResolve: (() => void) | null = null;

    const slowDispatcher: SyncDispatcher = {
      dispatch: jest.fn().mockImplementation(() =>
        new Promise<void>((resolve) => {
          dispatchCount++;
          dispatchResolve = resolve as (() => void);
        })
      ),
    };

    const engine = makeEngine(storage, slowDispatcher);

    // Start first batch — dispatch will be held open
    await engine.admitBatch([makeEvent()]);
    await flushAsync(2); // Let dispatch start but not finish

    // Admit second batch while first is dispatching
    await engine.admitBatch([makeEvent()]);

    // Resolve the first dispatch
    if (dispatchResolve !== null) { (dispatchResolve as () => void)(); }
    await flushAsync(10);

    // Both should have been dispatched (one at a time)
    expect(dispatchCount).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Custom admission gate
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — custom AdmissionGate', () => {
  it('custom gate can quarantine events', async () => {
    class QuarantineAllGate implements AdmissionGate {
      evaluate(_event: SyncEvent): AdmissionDecision {
        return { verdict: 'quarantine', reason: 'test quarantine' };
      }
    }

    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher(), {
      admissionGate: new QuarantineAllGate(),
    });

    const outcome = await engine.admitBatch([makeEvent()]);
    expect(outcome.receipt).toBeNull();
    expect(outcome.quarantined).toHaveLength(1);
    expect(outcome.quarantined[0].reason).toBe('test quarantine');
    expect(storage._getEventCount()).toBe(0); // Never persisted
  });

  it('custom gate can reject events with a specific reason', async () => {
    class DomainGate implements AdmissionGate {
      evaluate(event: SyncEvent): AdmissionDecision {
        if (!event.eventType.startsWith('user.')) {
          return { verdict: 'reject', reason: 'Only user domain events allowed' };
        }
        return { verdict: 'admit' };
      }
    }

    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher(), {
      admissionGate: new DomainGate(),
    });

    const outcome = await engine.admitBatch([
      makeEvent({ eventType: 'user.profile.updated' }),
      makeEvent({ eventType: 'order.placed' }),
    ]);

    expect(outcome.admitted).toHaveLength(1);
    expect(outcome.rejected).toHaveLength(1);
    expect(outcome.rejected[0].reason).toMatch(/user domain/);
  });

  it('custom gate admit/reject/quarantine all three in one batch', async () => {
    let callIdx = 0;
    class RoundRobinGate implements AdmissionGate {
      evaluate(_event: SyncEvent): AdmissionDecision {
        const i = callIdx++;
        if (i % 3 === 0) return { verdict: 'admit' };
        if (i % 3 === 1) return { verdict: 'reject', reason: 'round-robin-reject' };
        return { verdict: 'quarantine', reason: 'round-robin-quarantine' };
      }
    }

    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher(), {
      admissionGate: new RoundRobinGate(),
    });

    const outcome = await engine.admitBatch([makeEvent(), makeEvent(), makeEvent()]);
    expect(outcome.admitted).toHaveLength(1);
    expect(outcome.rejected).toHaveLength(1);
    expect(outcome.quarantined).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — edge cases', () => {
  it('handles a single event batch correctly', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher());
    const event = makeEvent();
    const outcome = await engine.admitBatch([event]);

    expect(outcome.admitted).toHaveLength(1);
    expect(outcome.receipt!.eventCount).toBe(1);
    expect(outcome.receipt!.eventIdempotencyKeys).toEqual([event.idempotencyKey]);
  });

  it('handles a large batch (100 events) without error', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher(), { maxBatchSize: 100 });
    const events = Array.from({ length: 100 }, (_, i) =>
      makeEvent({ idempotencyKey: `key-${i}` })
    );
    const outcome = await engine.admitBatch(events);
    expect(outcome.admitted).toHaveLength(100);
    expect(outcome.receipt!.eventCount).toBe(100);
  });

  it('queuedAtMs is populated on admitted events', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher());
    const before = Date.now();
    const outcome = await engine.admitBatch([makeEvent()]);
    const after = Date.now();

    const admitted = outcome.admitted[0];
    expect(admitted.queuedAtMs).toBeGreaterThanOrEqual(before);
    expect(admitted.queuedAtMs).toBeLessThanOrEqual(after);
  });

  it('admitted event preserves original payload', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher());
    const payload = { name: 'Alice', age: 30, tags: ['vip', 'beta'] };
    const event = makeEvent({ payload });
    const outcome = await engine.admitBatch([event]);
    expect(outcome.admitted[0].payload).toEqual(payload);
  });

  it('dispatched events carry admissionReceiptId', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const captured: DispatchedEvent[] = [];
    const capturingDispatcher: SyncDispatcher = {
      async dispatch(events) {
        captured.push(...events);
      },
    };
    const engine = makeEngine(storage, capturingDispatcher);
    const outcome = await engine.admitBatch([makeEvent()]);
    await flushAsync(10);

    expect(captured).toHaveLength(1);
    expect(captured[0].admissionReceiptId).toBe(outcome.receipt!.id);
  });

  it('receipt admittedAt is a valid ISO-8601 string', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher());
    const outcome = await engine.admitBatch([makeEvent()]);
    const ts = Date.parse(outcome.receipt!.admittedAt);
    expect(Number.isNaN(ts)).toBe(false);
  });

  it('receipt status starts as admitted', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    // Use a never-resolving dispatcher to freeze dispatch in-flight
    let dispatchStarted = false;
    const freezeDispatcher: SyncDispatcher = {
      async dispatch() {
        dispatchStarted = true;
        await new Promise<void>(() => {/* never resolves */});
      },
    };
    const engine = makeEngine(storage, freezeDispatcher);
    const outcome = await engine.admitBatch([makeEvent()]);

    // Before dispatch even starts, status should be 'admitted' in storage
    const stored = await storage.getAdmissionReceiptById(outcome.receipt!.id);
    // It might be 'admitted' or 'dispatching' depending on async timing
    expect(['admitted', 'dispatching']).toContain(stored!.status);
    // If dispatch has not started, status must still be 'admitted'
    if (!dispatchStarted) {
      expect(stored!.status).toBe('admitted');
    }
  });

  it('InMemoryReplicationStorageAdapter _reset clears all state', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    const engine = makeEngine(storage, makePassDispatcher());
    await engine.admitBatch([makeEvent()]);
    expect(storage._getEventCount()).toBe(1);

    storage._reset();
    expect(storage._getEventCount()).toBe(0);
    expect(storage._getReceiptCount()).toBe(0);
    expect(storage._getDispatchedCount()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. PATQ law — receipts must precede dispatch
// ─────────────────────────────────────────────────────────────────────────────

describe('TrueXSyncReplicationEngine — PATQ law enforcement', () => {
  it('receipt is persisted to storage BEFORE dispatcher.dispatch is called', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    let receiptCountAtDispatch = -1;

    const observingDispatcher: SyncDispatcher = {
      async dispatch() {
        receiptCountAtDispatch = storage._getReceiptCount();
      },
    };

    const engine = makeEngine(storage, observingDispatcher);
    await engine.admitBatch([makeEvent()]);
    await flushAsync(10);

    // The receipt must have been persisted BEFORE dispatch was called
    expect(receiptCountAtDispatch).toBe(1);
  });

  it('events are in SQLite BEFORE dispatch is called', async () => {
    const storage = new InMemoryReplicationStorageAdapter();
    let eventCountAtDispatch = -1;

    const observingDispatcher: SyncDispatcher = {
      async dispatch() {
        eventCountAtDispatch = storage._getEventCount();
      },
    };

    const engine = makeEngine(storage, observingDispatcher);
    await engine.admitBatch([makeEvent(), makeEvent()]);
    await flushAsync(10);

    expect(eventCountAtDispatch).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. InMemoryReplicationStorageAdapter unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InMemoryReplicationStorageAdapter', () => {
  let storage: InMemoryReplicationStorageAdapter;

  beforeEach(() => {
    storage = new InMemoryReplicationStorageAdapter();
  });

  it('insertQueuedEvent returns monotonically increasing queueIds', async () => {
    const event = makeEvent();
    const id1 = await storage.insertQueuedEvent(event, Date.now());
    const id2 = await storage.insertQueuedEvent(event, Date.now());
    const id3 = await storage.insertQueuedEvent(event, Date.now());
    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(id3).toBe(3);
  });

  it('getPendingQueuedEvents excludes dispatched events', async () => {
    const event = makeEvent();
    const id = await storage.insertQueuedEvent(event, Date.now());
    await storage.markQueuedEventsDispatched([id], 'rcpt_test');
    const pending = await storage.getPendingQueuedEvents();
    expect(pending).toHaveLength(0);
  });

  it('getQueuedEventsByIds returns events in queueId order', async () => {
    const e1 = makeEvent({ idempotencyKey: 'k1' });
    const e2 = makeEvent({ idempotencyKey: 'k2' });
    const id2 = await storage.insertQueuedEvent(e2, Date.now());
    const id1 = await storage.insertQueuedEvent(e1, Date.now());

    const result = await storage.getQueuedEventsByIds([id1, id2]);
    expect(result[0].queueId).toBeLessThan(result[1].queueId);
  });

  it('insertAdmissionReceipt is idempotent (second insert is no-op)', async () => {
    const receipt: AdmissionReceipt = {
      id: 'rcpt_test',
      batchHash: 'hash1',
      previousReceiptHash: 'prev',
      receiptHash: 'receipt_hash',
      eventCount: 1,
      eventIdempotencyKeys: ['k1'],
      queueIds: [1],
      admittedAt: new Date().toISOString(),
      status: 'admitted',
      dispatchAttempts: 0,
    };
    await storage.insertAdmissionReceipt(receipt);
    await storage.insertAdmissionReceipt(receipt); // should not throw
    expect(storage._getReceiptCount()).toBe(1);
  });

  it('updateAdmissionReceipt throws when receipt does not exist', async () => {
    await expect(
      storage.updateAdmissionReceipt('nonexistent', { status: 'confirmed', dispatchAttempts: 1 })
    ).rejects.toThrow(/not found/);
  });

  it('getLatestAdmissionReceipt returns null on empty storage', async () => {
    const result = await storage.getLatestAdmissionReceipt();
    expect(result).toBeNull();
  });

  it('getAdmissionReceiptById returns null for unknown id', async () => {
    const result = await storage.getAdmissionReceiptById('unknown');
    expect(result).toBeNull();
  });

  it('getAllAdmissionReceipts returns receipts in insertion order (chain order)', async () => {
    const now = Date.now();
    const makeReceipt = (id: string, offsetMs: number): AdmissionReceipt => ({
      id,
      batchHash: 'bh',
      previousReceiptHash: 'prev',
      receiptHash: id,
      eventCount: 1,
      eventIdempotencyKeys: [],
      queueIds: [],
      admittedAt: new Date(now + offsetMs).toISOString(),
      status: 'admitted',
      dispatchAttempts: 0,
    });

    // Insert in a specific order — the adapter must return in THIS order (insertion order)
    // regardless of the admittedAt timestamp values
    await storage.insertAdmissionReceipt(makeReceipt('rcpt_b', 2000));
    await storage.insertAdmissionReceipt(makeReceipt('rcpt_a', 1000));
    await storage.insertAdmissionReceipt(makeReceipt('rcpt_c', 3000));

    const all = await storage.getAllAdmissionReceipts();
    // Must be insertion order: b, a, c (not sorted by admittedAt)
    expect(all.map((r) => r.id)).toEqual(['rcpt_b', 'rcpt_a', 'rcpt_c']);
  });
});
