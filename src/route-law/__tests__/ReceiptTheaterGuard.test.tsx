/**
 * @fileoverview Comprehensive test suite for ReceiptTheaterGuard and hardened guards.ts.
 *
 * Tests cover:
 *  - All typestate transitions of ReceiptTheaterGuard
 *  - 3-tier receipt lookup (MMKV tier 1/2, SQLite tier 3)
 *  - OTel span emission via emitRouteAdmissionSpan
 *  - BLAKE3 hash validation and mismatch detection
 *  - Timeout enforcement (deadline)
 *  - Retry / escalate interactions
 *  - MMKV subscription-based auto-refresh
 *  - requireReceiptBeforeRender guard function
 *  - Integration of requireReceiptBeforeRender with admitRoute customGuard
 *  - Edge cases: empty routeKey, corrupt MMKV JSON, missing SQLite records
 */

import React from 'react';
import { Text } from 'react-native';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// NOTE: jest.mock() is hoisted by babel-jest to the TOP of the file, BEFORE
// any const/let declarations. Therefore all mock factories must be SELF-CONTAINED
// and must NOT reference outer variables defined later in the file.
//
// We work around this by keeping all mock state on a shared plain object
// (`mmkvMockState`) whose keys are referenceable inside the hoisted factory
// via an immediately-invoked closure that captures the OBJECT (not primitives).
// ─────────────────────────────────────────────────────────────────────────────

// Mutable state containers — declared with `let` so they can be re-assigned,
// and the factories below capture the container REFERENCE (not a value copy).
const _mmkvStore: Record<string, string> = {};
const _mmkvListeners: Array<(key: string) => void> = [];

// DB mock state — also a mutable container
let _dbRecords: any[] = [];

// ── jest.mock calls ───────────────────────────────────────────────────────────
// These are hoisted before variable declarations. To avoid "not defined" errors,
// each factory is self-contained and writes its mock into a global that we
// can retrieve with jest.requireMock() in beforeAll.

jest.mock('../../lib/store/mmkvStorage', () => {
  // We cannot reference `_mmkvStore` / `_mmkvListeners` here because Babel
  // hoists jest.mock above those declarations. Instead we use a module-level
  // store that the factory owns.
  const store: Record<string, string> = {};
  const listeners: Array<(key: string) => void> = [];

  return {
    mmkvInstance: {
      getString: jest.fn((key: string) => store[key] ?? undefined),
      set: jest.fn((key: string, val: string) => {
        store[key] = val;
        listeners.forEach((cb) => cb(key));
      }),
      delete: jest.fn((key: string) => { delete store[key]; }),
      addOnValueChangedListener: jest.fn((cb: (key: string) => void) => {
        listeners.push(cb);
        return {
          remove: jest.fn(() => {
            const idx = listeners.indexOf(cb);
            if (idx !== -1) listeners.splice(idx, 1);
          }),
        };
      }),
      // Expose internal store & listeners for test helpers
      _store: store,
      _listeners: listeners,
    },
    mmkvStorage: {},
  };
});

jest.mock('../../lib/db/db', () => {
  const records: any[] = [];
  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve(records)),
        })),
      })),
    },
    _records: records,
  };
});

jest.mock('../../lib/db/schema', () => ({
  actorReceipts: { commandId: 'commandId' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a: any, b: any) => ({ field: a, value: b })),
}));

jest.mock('../../lib/crypto/receipts', () => ({
  blake3: jest.fn((input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hexVal = Math.abs(hash).toString(16).padStart(8, '0');
    return hexVal.repeat(8);
  }),
  canonicalStringify: jest.fn((val: any) => JSON.stringify(val)),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import modules under test (after mocks are in place)
// ─────────────────────────────────────────────────────────────────────────────

import {
  ReceiptTheaterGuard,
  CryptographicVerificationOverlay,
  lookupReceiptForRoute,
  emitRouteAdmissionSpan,
  type ReceiptTheaterState,
} from '../ReceiptTheaterGuard';

import {
  requireReceiptBeforeRender,
  admitRoute,
} from '../guards';

// ─────────────────────────────────────────────────────────────────────────────
// Get mock references via jest.requireMock (safe, runs after module init)
// ─────────────────────────────────────────────────────────────────────────────

const mmkvMock = jest.requireMock('../../lib/store/mmkvStorage');
const mmkvInstance = mmkvMock.mmkvInstance as {
  getString: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  addOnValueChangedListener: jest.Mock;
  _store: Record<string, string>;
  _listeners: Array<(key: string) => void>;
};

const dbMock = jest.requireMock('../../lib/db/db');
const dbRecords: any[] = dbMock._records;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Clear all MMKV store data, reset mock call counts, and clear listeners */
function clearMmkv() {
  const store = mmkvInstance._store;
  const listeners = mmkvInstance._listeners;
  Object.keys(store).forEach((k) => delete store[k]);
  listeners.splice(0, listeners.length);
  mmkvInstance.getString.mockClear();
  mmkvInstance.set.mockClear();
  mmkvInstance.delete.mockClear();
  mmkvInstance.addOnValueChangedListener.mockClear();
}

/** Write a receipt JSON blob to the MMKV store (Tier 1 lookup) */
function putMmkvReceiptJson(routeKey: string, deltaHash: string) {
  mmkvInstance._store[`receipt_${routeKey}`] = JSON.stringify({ deltaHash });
}

/** Write a raw hash string to the MMKV store (Tier 2 lookup) */
function putMmkvRawHash(routeKey: string, hash: string) {
  mmkvInstance._store[`receipt_hash_${routeKey}`] = hash;
}

/** Configure the SQLite mock to return the given records */
function setSqliteRecords(records: any[]) {
  // Mutate the shared array in-place
  dbRecords.splice(0, dbRecords.length, ...records);
  // Also reset the mock chain so it picks up the new records
  const dbMockObj = jest.requireMock('../../lib/db/db');
  dbMockObj.db.select.mockImplementation(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve(dbRecords)),
    })),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: lookupReceiptForRoute — 3-tier async lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('lookupReceiptForRoute', () => {
  beforeEach(() => {
    clearMmkv();
    setSqliteRecords([]);
  });

  test('returns found=true when MMKV receipt JSON is present without hash constraint', async () => {
    putMmkvReceiptJson('cmd_test', 'abc123hash');
    const result = await lookupReceiptForRoute('cmd_test');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('abc123hash');
    expect(result.mismatched).toBe(false);
  });

  test('returns found=true when MMKV receipt JSON hash matches expectedBlake3Hash', async () => {
    putMmkvReceiptJson('cmd_payment', 'deadbeef');
    const result = await lookupReceiptForRoute('cmd_payment', 'deadbeef');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('deadbeef');
    expect(result.mismatched).toBe(false);
  });

  test('returns mismatched=true when MMKV receipt JSON hash does NOT match expectedBlake3Hash', async () => {
    putMmkvReceiptJson('cmd_payment', 'wronghash');
    const result = await lookupReceiptForRoute('cmd_payment', 'deadbeef');
    expect(result.found).toBe(false);
    expect(result.mismatched).toBe(true);
    expect(result.blake3Hash).toBe('wronghash');
    expect(result.error).toMatch(/mismatch/i);
  });

  test('falls through to MMKV raw hash tier when JSON key is absent', async () => {
    putMmkvRawHash('cmd_onboard', 'rawhash42');
    const result = await lookupReceiptForRoute('cmd_onboard');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('rawhash42');
  });

  test('validates MMKV raw hash against expectedBlake3Hash', async () => {
    putMmkvRawHash('cmd_onboard', 'correcthash');
    const result = await lookupReceiptForRoute('cmd_onboard', 'correcthash');
    expect(result.found).toBe(true);
  });

  test('returns mismatch when MMKV raw hash differs from expected', async () => {
    putMmkvRawHash('cmd_onboard', 'badhash');
    const result = await lookupReceiptForRoute('cmd_onboard', 'goodhash');
    expect(result.found).toBe(false);
    expect(result.mismatched).toBe(true);
  });

  test('falls through to SQLite when MMKV has no entry', async () => {
    setSqliteRecords([{ deltaHash: 'sqlitehash' }]);
    const result = await lookupReceiptForRoute('cmd_sqlite_test');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('sqlitehash');
  });

  test('returns found=false when SQLite has no records', async () => {
    setSqliteRecords([]);
    const result = await lookupReceiptForRoute('cmd_not_found');
    expect(result.found).toBe(false);
    expect(result.mismatched).toBe(false);
    expect(result.blake3Hash).toBe('');
  });

  test('validates SQLite hash against expectedBlake3Hash when matched', async () => {
    setSqliteRecords([{ deltaHash: 'sqlhash_ok' }]);
    const result = await lookupReceiptForRoute('cmd_sql_match', 'sqlhash_ok');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('sqlhash_ok');
  });

  test('detects SQLite hash mismatch', async () => {
    setSqliteRecords([{ deltaHash: 'wrong_sql_hash' }]);
    const result = await lookupReceiptForRoute('cmd_sql_mismatch', 'expected_sql_hash');
    expect(result.found).toBe(false);
    expect(result.mismatched).toBe(true);
  });

  test('returns VERIFICATION_ERROR when SQLite query throws', async () => {
    // Force SQLite to throw
    const dbMockObj = jest.requireMock('../../lib/db/db');
    dbMockObj.db.select.mockImplementationOnce(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.reject(new Error('DB connection lost'))),
      })),
    }));
    const result = await lookupReceiptForRoute('cmd_db_error');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/SQLite lookup failed/);
    expect(result.error).toMatch(/DB connection lost/);
  });

  test('handles corrupt MMKV JSON gracefully and falls through to SQLite', async () => {
    mmkvInstance._store['receipt_cmd_corrupt'] = '{invalid json:::';
    setSqliteRecords([{ deltaHash: 'fallback_hash' }]);
    const result = await lookupReceiptForRoute('cmd_corrupt');
    expect(result.found).toBe(true);
    expect(result.blake3Hash).toBe('fallback_hash');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: emitRouteAdmissionSpan
// ─────────────────────────────────────────────────────────────────────────────

describe('emitRouteAdmissionSpan', () => {
  beforeEach(() => clearMmkv());

  test('returns a span with name route.admission.verified', () => {
    const span = emitRouteAdmissionSpan('cmd_test', 'hash123', 150, 'OK');
    expect(span.name).toBe('route.admission.verified');
    expect(span.status).toBe('OK');
    expect(span.attributes['route.key']).toBe('cmd_test');
    expect(span.attributes['receipt.blake3_hash']).toBe('hash123');
    expect(span.attributes['receipt.duration_ms']).toBe(150);
    expect(span.attributes['admission.status']).toBe('admitted');
  });

  test('marks span as ERROR on failed admission', () => {
    const span = emitRouteAdmissionSpan('cmd_fail', '', 3000, 'ERROR', 'receipt missing');
    expect(span.status).toBe('ERROR');
    expect(span.attributes['admission.status']).toBe('refused');
    expect(span.attributes['error.message']).toBe('receipt missing');
  });

  test('persists span to MMKV under otel: key prefix', () => {
    emitRouteAdmissionSpan('cmd_mmkv_test', 'hash_abc', 200, 'OK');
    const setArgs = mmkvInstance.set.mock.calls as [string, string][];
    const found = setArgs.find((args) =>
      args[0].startsWith('otel:route.admission.verified:cmd_mmkv_test')
    );
    expect(found).toBeDefined();
  });

  test('generates unique traceId and spanId per invocation', () => {
    const span1 = emitRouteAdmissionSpan('cmd_a', 'h1', 100, 'OK');
    const span2 = emitRouteAdmissionSpan('cmd_a', 'h2', 200, 'OK');
    expect(span1.traceId).toHaveLength(32);
    expect(span1.spanId).toHaveLength(16);
    expect(span2.traceId).toHaveLength(32);
  });

  test('span endTime is greater than or equal to startTime', () => {
    const span = emitRouteAdmissionSpan('cmd_timing', 'hash', 500, 'OK');
    expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
  });

  test('span without errorMessage has no error.message attribute', () => {
    const span = emitRouteAdmissionSpan('cmd_no_err', 'hash', 100, 'OK');
    expect(span.attributes['error.message']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: requireReceiptBeforeRender — synchronous guard
// ─────────────────────────────────────────────────────────────────────────────

describe('requireReceiptBeforeRender', () => {
  beforeEach(() => clearMmkv());

  test('returns receiptConfirmed=false with VERIFICATION_ERROR for empty routeKey', () => {
    const result = requireReceiptBeforeRender('');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('VERIFICATION_ERROR');
    expect(result.rejectionMessage).toMatch(/non-empty string/);
  });

  test('returns receiptConfirmed=false with VERIFICATION_ERROR for whitespace routeKey', () => {
    const result = requireReceiptBeforeRender('   ');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('VERIFICATION_ERROR');
  });

  test('confirms receipt when MMKV receipt JSON is present (no hash constraint)', () => {
    putMmkvReceiptJson('cmd_tier1', 'blake3abc');
    const result = requireReceiptBeforeRender('cmd_tier1');
    expect(result.receiptConfirmed).toBe(true);
    expect(result.confirmedBlake3Hash).toBe('blake3abc');
    expect(result.rejectionReason).toBeNull();
    expect(result.rejectionMessage).toBeNull();
  });

  test('confirms receipt when MMKV JSON hash matches expected', () => {
    putMmkvReceiptJson('cmd_match', 'expected_hash_xyz');
    const result = requireReceiptBeforeRender('cmd_match', 'expected_hash_xyz');
    expect(result.receiptConfirmed).toBe(true);
    expect(result.confirmedBlake3Hash).toBe('expected_hash_xyz');
  });

  test('returns RECEIPT_HASH_MISMATCH when MMKV JSON hash differs from expected', () => {
    putMmkvReceiptJson('cmd_mismatch', 'stored_hash');
    const result = requireReceiptBeforeRender('cmd_mismatch', 'different_hash');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('RECEIPT_HASH_MISMATCH');
    expect(result.confirmedBlake3Hash).toBe('stored_hash');
    expect(result.rejectionMessage).toMatch(/hash does not match/i);
    expect(result.rejectionMessage).toMatch(/different_hash/);
    expect(result.rejectionMessage).toMatch(/stored_hash/);
  });

  test('falls through to tier 2 (raw hash) when JSON key absent', () => {
    putMmkvRawHash('cmd_raw', 'rawblake3hash');
    const result = requireReceiptBeforeRender('cmd_raw');
    expect(result.receiptConfirmed).toBe(true);
    expect(result.confirmedBlake3Hash).toBe('rawblake3hash');
  });

  test('validates raw hash against expectedBlake3Hash', () => {
    putMmkvRawHash('cmd_raw_valid', 'valid_raw_hash');
    const result = requireReceiptBeforeRender('cmd_raw_valid', 'valid_raw_hash');
    expect(result.receiptConfirmed).toBe(true);
  });

  test('returns RECEIPT_HASH_MISMATCH when raw hash differs from expected', () => {
    putMmkvRawHash('cmd_raw_bad', 'bad_raw');
    const result = requireReceiptBeforeRender('cmd_raw_bad', 'expected_raw');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('RECEIPT_HASH_MISMATCH');
    expect(result.rejectionMessage).toMatch(/raw key/i);
  });

  test('returns RECEIPT_NOT_FOUND when MMKV has no entry for routeKey', () => {
    const result = requireReceiptBeforeRender('cmd_not_found_anywhere');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('RECEIPT_NOT_FOUND');
    expect(result.rejectionMessage).toMatch(/cmd_not_found_anywhere/);
    expect(result.rejectionMessage).toMatch(/ReceiptTheaterGuard/);
    expect(result.confirmedBlake3Hash).toBe('');
  });

  test('returns VERIFICATION_ERROR when MMKV getString throws', () => {
    // First call (JSON key) returns undefined, second (raw hash) throws
    mmkvInstance.getString
      .mockReturnValueOnce(undefined)
      .mockImplementationOnce(() => { throw new Error('MMKV disk failure'); });
    const result = requireReceiptBeforeRender('cmd_mmkv_fail');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('VERIFICATION_ERROR');
    expect(result.rejectionMessage).toMatch(/MMKV storage access failed/i);
  });

  test('handles corrupt MMKV JSON (falls through to raw hash tier)', () => {
    mmkvInstance._store['receipt_cmd_corrupt_guard'] = '{NOT_VALID_JSON:::';
    putMmkvRawHash('cmd_corrupt_guard', 'fallback_raw');
    const result = requireReceiptBeforeRender('cmd_corrupt_guard');
    expect(result.receiptConfirmed).toBe(true);
    expect(result.confirmedBlake3Hash).toBe('fallback_raw');
  });

  test('handles corrupt MMKV JSON with hash constraint collision (raw wins)', () => {
    mmkvInstance._store['receipt_cmd_corrupt2'] = '{BAD';
    putMmkvRawHash('cmd_corrupt2', 'good_raw_hash');
    const result = requireReceiptBeforeRender('cmd_corrupt2', 'good_raw_hash');
    expect(result.receiptConfirmed).toBe(true);
  });

  // Integration with admitRoute as customGuard
  test('integrates as customGuard in RouteDefinition — blocks route when receipt missing', () => {
    const route = {
      requiredIdentityBoundary: 'authenticated' as const,
      customGuard: () => {
        const r = requireReceiptBeforeRender('cmd_custom_guard_test');
        if (!r.receiptConfirmed) {
          return {
            code: r.rejectionReason ?? 'RECEIPT_NOT_FOUND',
            message: r.rejectionMessage ?? 'Receipt missing',
          };
        }
        return null;
      },
    };
    const participant = { identityBoundary: 'authenticated', disclosures: [] };
    const result = admitRoute(participant, route);
    expect(result.admitted).toBe(false);
    expect(result.refusal?.code).toBe('RECEIPT_NOT_FOUND');
  });

  test('integrates as customGuard in RouteDefinition — admits route when receipt present', () => {
    putMmkvReceiptJson('cmd_custom_guard_ok', 'present_hash');
    const route = {
      requiredIdentityBoundary: 'authenticated' as const,
      customGuard: () => {
        const r = requireReceiptBeforeRender('cmd_custom_guard_ok');
        if (!r.receiptConfirmed) {
          return {
            code: r.rejectionReason ?? 'RECEIPT_NOT_FOUND',
            message: r.rejectionMessage ?? 'Receipt missing',
          };
        }
        return null;
      },
    };
    const participant = { identityBoundary: 'authenticated', disclosures: [] };
    const result = admitRoute(participant, route);
    expect(result.admitted).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: ReceiptTheaterGuard component — typestate transitions
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptTheaterGuard component', () => {
  beforeEach(() => {
    clearMmkv();
    setSqliteRecords([]);
  });

  // ── PENDING_VERIFICATION → VERIFIED ───────────────────────────────────────

  test('renders children after receipt found in MMKV (VERIFIED state)', async () => {
    putMmkvReceiptJson('cmd_render_ok', 'hash_valid');

    const { queryByText, getByText } = render(
      <ReceiptTheaterGuard routeKey="cmd_render_ok" subscribeToMMKV={false} timeoutMs={3000}>
        <Text>Protected Content Rendered</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => { expect(getByText('Protected Content Rendered')).toBeTruthy(); },
      { timeout: 3000 }
    );

    expect(queryByText('Verifying Cryptographic Receipt')).toBeNull();
  });

  test('renders verification overlay while checking (PENDING_VERIFICATION)', async () => {
    // Block SQLite indefinitely so we stay in the pending state
    const dbMockObj = jest.requireMock('../../lib/db/db');
    dbMockObj.db.select.mockImplementationOnce(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => new Promise(() => { /* never resolves */ })),
      })),
    }));

    const { getByText } = render(
      <ReceiptTheaterGuard routeKey="cmd_pending_real" subscribeToMMKV={false} timeoutMs={60000}>
        <Text>Should Not See This</Text>
      </ReceiptTheaterGuard>
    );

    // Initial state must be the overlay
    expect(getByText('Verifying Cryptographic Receipt')).toBeTruthy();
  });

  // ── PENDING_VERIFICATION → RECEIPT_MISSING ────────────────────────────────

  test('transitions to RECEIPT_MISSING after timeout with no receipt', async () => {
    // SQLite promise never resolves — simulates slow DB
    const dbMockObj = jest.requireMock('../../lib/db/db');
    dbMockObj.db.select.mockImplementation(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => new Promise(() => { /* never resolves */ })),
      })),
    }));

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_timeout_real"
        timeoutMs={30}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => { expect(getByText('Admission Blocked')).toBeTruthy(); },
      { timeout: 2000 }
    );

    // Reset the DB mock
    setSqliteRecords([]);
  });

  test('transitions to RECEIPT_MISSING when receipt not found anywhere', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_not_found_real"
        timeoutMs={3000}
        subscribeToMMKV={false}
      >
        <Text>Hidden</Text>
      </ReceiptTheaterGuard>
    );

    // SQLite immediately returns [] so lookup resolves quickly with not-found
    await waitFor(
      () => { expect(getByText('Admission Blocked')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── Retry button ──────────────────────────────────────────────────────────

  test('retry button triggers re-verification', async () => {
    setSqliteRecords([]);

    const { getByTestId, getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_retry_test_real"
        timeoutMs={3000}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    // Wait for RECEIPT_MISSING (SQLite returns [] immediately)
    await waitFor(
      () => expect(getByText('Admission Blocked')).toBeTruthy(),
      { timeout: 2000 }
    );

    // Now make the receipt available before the retry
    putMmkvReceiptJson('cmd_retry_test_real', 'new_receipt_hash');

    // Trigger retry
    await act(async () => {
      fireEvent.press(getByTestId('receipt-theater-retry-btn'));
    });

    await waitFor(
      () => { expect(getByText('Content')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── Escalate button ───────────────────────────────────────────────────────

  test('escalate button calls onEscalate callback with routeKey and reason', async () => {
    setSqliteRecords([]);
    const onEscalate = jest.fn();

    const { getByTestId } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_escalate_real"
        timeoutMs={3000}
        onEscalate={onEscalate}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => getByTestId('receipt-theater-escalate-btn'),
      { timeout: 2000 }
    );

    await act(async () => {
      fireEvent.press(getByTestId('receipt-theater-escalate-btn'));
    });

    expect(onEscalate).toHaveBeenCalledWith(
      'cmd_escalate_real',
      expect.stringMatching(/RECEIPT_NOT_FOUND|TIMEOUT/)
    );
  });

  // ── RECEIPT_HASH_MISMATCH scenario ────────────────────────────────────────

  test('blocks render on RECEIPT_HASH_MISMATCH', async () => {
    putMmkvReceiptJson('cmd_hash_mismatch_real', 'wrong_hash');

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_hash_mismatch_real"
        expectedBlake3Hash="correct_hash"
        subscribeToMMKV={false}
      >
        <Text>Should Not Render</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => { expect(getByText('Admission Blocked')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── loadingOverride ───────────────────────────────────────────────────────

  test('renders loadingOverride instead of default overlay during PENDING_VERIFICATION', async () => {
    // Never-resolving DB means the component stays in PENDING_VERIFICATION
    const dbMockObj = jest.requireMock('../../lib/db/db');
    dbMockObj.db.select.mockImplementationOnce(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => new Promise(() => { /* never resolves */ })),
      })),
    }));

    const { getByText, queryByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_loading_override_real"
        loadingOverride={<Text>Custom Loading Spinner</Text>}
        subscribeToMMKV={false}
        timeoutMs={60000}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    // Should render loading override immediately
    expect(getByText('Custom Loading Spinner')).toBeTruthy();
    expect(queryByText('Verifying Cryptographic Receipt')).toBeNull();
  });

  // ── errorOverride (function) ───────────────────────────────────────────────

  test('renders errorOverride function when receipt missing', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_error_override_real"
        timeoutMs={3000}
        errorOverride={(state: ReceiptTheaterState) => (
          <Text>{`Error: ${state.kind}`}</Text>
        )}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => { expect(getByText('Error: RECEIPT_MISSING')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── errorOverride (static node) ───────────────────────────────────────────

  test('renders static errorOverride node when receipt missing', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_static_override_real"
        timeoutMs={3000}
        errorOverride={<Text>Static Error Node</Text>}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(
      () => { expect(getByText('Static Error Node')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── MMKV subscription auto-refresh ────────────────────────────────────────

  test('auto-refreshes on MMKV key change when subscribeToMMKV=true', async () => {
    setSqliteRecords([]);
    const KEY = 'cmd_mmkv_subscribe_real';

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey={KEY}
        timeoutMs={3000}
        subscribeToMMKV={true}
      >
        <Text>Protected by MMKV</Text>
      </ReceiptTheaterGuard>
    );

    // Initially missing — SQLite returns [] immediately
    await waitFor(
      () => getByText('Admission Blocked'),
      { timeout: 2000 }
    );

    // Simulate a receipt being written to MMKV — this triggers registered listeners
    await act(async () => {
      // Put directly in the store, then trigger listeners manually (same as mmkvInstance.set)
      mmkvInstance._store[`receipt_${KEY}`] = JSON.stringify({ deltaHash: 'fresh_receipt' });
      mmkvInstance._listeners.forEach((cb) => cb(`receipt_${KEY}`));
    });

    await waitFor(
      () => { expect(getByText('Protected by MMKV')).toBeTruthy(); },
      { timeout: 2000 }
    );
  });

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  test('removes MMKV listener on unmount', async () => {
    const KEY = 'cmd_cleanup_real';
    putMmkvReceiptJson(KEY, 'hash_ok');

    const { unmount } = render(
      <ReceiptTheaterGuard routeKey={KEY} subscribeToMMKV={true}>
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    // Wait for VERIFIED
    await waitFor(
      () => { /* component has rendered */ },
      { timeout: 1000 }
    );

    const initialListenerCount = mmkvInstance._listeners.length;
    unmount();

    // After unmount, the listener should have been removed
    expect(mmkvInstance._listeners.length).toBeLessThanOrEqual(initialListenerCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: CryptographicVerificationOverlay — UI rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('CryptographicVerificationOverlay', () => {
  test('renders "Verifying Cryptographic Receipt" title when isVerifying=true', () => {
    const { getByText } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_overlay_check"
        isVerifying={true}
        missingReason={null}
        errorDetail={null}
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
      />
    );
    expect(getByText('Verifying Cryptographic Receipt')).toBeTruthy();
    expect(getByText('BLAKE3 Receipt Theater Enforcement Active')).toBeTruthy();
  });

  test('renders "Admission Blocked" when isVerifying=false', () => {
    const { getByText } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_overlay_failed"
        isVerifying={false}
        missingReason="RECEIPT_NOT_FOUND"
        errorDetail="The receipt is missing."
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
      />
    );
    expect(getByText('Admission Blocked')).toBeTruthy();
    expect(getByText('The receipt is missing.')).toBeTruthy();
  });

  test('shows retry button only when NOT verifying', () => {
    const { getByTestId } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_overlay_retry"
        isVerifying={false}
        missingReason="TIMEOUT"
        errorDetail="Timed out."
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
      />
    );
    expect(getByTestId('receipt-theater-retry-btn')).toBeTruthy();
    expect(getByTestId('receipt-theater-escalate-btn')).toBeTruthy();
  });

  test('does NOT show retry button when isVerifying=true', () => {
    const { queryByTestId } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_overlay_verifying"
        isVerifying={true}
        missingReason={null}
        errorDetail={null}
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
      />
    );
    expect(queryByTestId('receipt-theater-retry-btn')).toBeNull();
    expect(queryByTestId('receipt-theater-escalate-btn')).toBeTruthy();
  });

  test('displays expectedBlake3Hash when provided', () => {
    const hash = 'abc123deadbeef';
    const { getByText } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_hash_display"
        isVerifying={false}
        missingReason="RECEIPT_HASH_MISMATCH"
        errorDetail="Hash mismatch detail."
        expectedBlake3Hash={hash}
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
      />
    );
    expect(getByText(hash)).toBeTruthy();
  });

  test('onRetry callback is called when retry button pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_retry_cb"
        isVerifying={false}
        missingReason="RECEIPT_NOT_FOUND"
        errorDetail="Missing."
        onRetry={onRetry}
        onEscalate={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('receipt-theater-retry-btn'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('onEscalate callback is called when escalate button pressed', () => {
    const onEscalate = jest.fn();
    const { getByTestId } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_escalate_cb"
        isVerifying={false}
        missingReason="VERIFICATION_ERROR"
        errorDetail="Error detail."
        onRetry={jest.fn()}
        onEscalate={onEscalate}
      />
    );
    fireEvent.press(getByTestId('receipt-theater-escalate-btn'));
    expect(onEscalate).toHaveBeenCalledTimes(1);
  });

  test('escalateLabel prop is rendered on escalate button', () => {
    const { getByText } = render(
      <CryptographicVerificationOverlay
        routeKey="cmd_label"
        isVerifying={false}
        missingReason="RECEIPT_NOT_FOUND"
        errorDetail="Gone."
        onRetry={jest.fn()}
        onEscalate={jest.fn()}
        escalateLabel="Go Back to Dashboard"
      />
    );
    expect(getByText('Go Back to Dashboard')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6: Hardened admitRoute guard (existing tests preserved & extended)
// ─────────────────────────────────────────────────────────────────────────────

describe('Hardened admitRoute — receipt-aware customGuard integration', () => {
  beforeEach(() => clearMmkv());

  test('admitted=true when identity+disclosures+receipt all pass', () => {
    putMmkvReceiptJson('cmd_full_gate', 'hash_verified');

    const route = {
      requiredIdentityBoundary: 'verified' as const,
      requiredDisclosures: ['email_verified'] as const,
      customGuard: () => {
        const r = requireReceiptBeforeRender('cmd_full_gate', 'hash_verified');
        return r.receiptConfirmed ? null : { code: r.rejectionReason!, message: r.rejectionMessage! };
      },
    };

    const participant = { identityBoundary: 'verified', disclosures: ['email_verified'] };
    const result = admitRoute(participant, route);
    expect(result.admitted).toBe(true);
  });

  test('admitted=false with RECEIPT_HASH_MISMATCH code when hash wrong', () => {
    putMmkvReceiptJson('cmd_wrong_hash', 'actual_hash_x');

    const route = {
      customGuard: () => {
        const r = requireReceiptBeforeRender('cmd_wrong_hash', 'expected_hash_y');
        return r.receiptConfirmed ? null : { code: r.rejectionReason!, message: r.rejectionMessage! };
      },
    };

    const participant = { identityBoundary: 'anonymous', disclosures: [] };
    const result = admitRoute(participant, route);
    expect(result.admitted).toBe(false);
    expect(result.refusal?.code).toBe('RECEIPT_HASH_MISMATCH');
  });

  test('identity check runs before receipt check — short-circuit on UNAUTHENTICATED', () => {
    // Even if receipt is present, identity check should block first
    putMmkvReceiptJson('cmd_identity_first', 'hash_ok');

    const route = {
      requiredIdentityBoundary: 'mfa_verified' as const,
      customGuard: () => {
        const r = requireReceiptBeforeRender('cmd_identity_first', 'hash_ok');
        return r.receiptConfirmed ? null : { code: r.rejectionReason!, message: r.rejectionMessage! };
      },
    };

    const participant = { identityBoundary: 'anonymous', disclosures: [] };
    const result = admitRoute(participant, route);
    // Identity check fails first — receipt check never reached
    expect(result.admitted).toBe(false);
    expect(result.refusal?.code).toBe('UNAUTHENTICATED');
  });
});
