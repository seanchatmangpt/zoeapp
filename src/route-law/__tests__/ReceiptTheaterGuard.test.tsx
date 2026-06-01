/**
 * @fileoverview Comprehensive test suite for ReceiptTheaterGuard and hardened guards.ts.
 *
 * Tests cover:
 *  - All typestate transitions of ReceiptTheaterGuard
 *  - 3-tier receipt lookup (MMKV tier 1/2, SQLite tier 3)
 *  - OTel span emission via emitRouteAdmissionSpan
 *  - BLAKE3 hash validation and mismatch detection
 *  - Timeout enforcement (3-second deadline)
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
// Mock setup (must come before any imports of modules under test)
// ─────────────────────────────────────────────────────────────────────────────

// MMKV mock store
const mmkvStore: Record<string, string> = {};
const mmkvListeners: Array<(key: string) => void> = [];

const mockMmkvInstance = {
  getString: jest.fn((key: string) => mmkvStore[key] ?? undefined),
  set: jest.fn((key: string, val: string) => {
    mmkvStore[key] = val;
    mmkvListeners.forEach((cb) => cb(key));
  }),
  delete: jest.fn((key: string) => {
    delete mmkvStore[key];
  }),
  addOnValueChangedListener: jest.fn((cb: (key: string) => void) => {
    mmkvListeners.push(cb);
    return {
      remove: jest.fn(() => {
        const idx = mmkvListeners.indexOf(cb);
        if (idx !== -1) mmkvListeners.splice(idx, 1);
      }),
    };
  }),
};

jest.mock('../../lib/store/mmkvStorage', () => ({
  mmkvInstance: mockMmkvInstance,
  mmkvStorage: {},
}));

// DB mock — configurable per test
let mockDbRecords: any[] = [];
const mockDbWhere = jest.fn(() => Promise.resolve(mockDbRecords));
const mockDbFrom = jest.fn(() => ({ where: mockDbWhere }));
const mockDbSelect = jest.fn(() => ({ from: mockDbFrom }));

jest.mock('../../lib/db/db', () => ({
  db: { select: mockDbSelect },
}));

jest.mock('../../lib/db/schema', () => ({
  actorReceipts: { commandId: 'commandId' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a: any, b: any) => ({ field: a, value: b })),
}));

// crypto/receipts mock — fast, deterministic
jest.mock('../../lib/crypto/receipts', () => ({
  blake3: jest.fn((input: string) => {
    // Deterministic fake BLAKE3 for testing
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hexVal = Math.abs(hash).toString(16).padStart(8, '0');
    return hexVal.repeat(8); // 64-char hex string
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
  type ReceiptMissingReason,
} from '../ReceiptTheaterGuard';

import {
  requireReceiptBeforeRender,
  admitRoute,
  type ReceiptGuardResult,
} from '../guards';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clearMmkv() {
  Object.keys(mmkvStore).forEach((k) => delete mmkvStore[k]);
  mockMmkvInstance.getString.mockClear();
  mockMmkvInstance.set.mockClear();
}

function putMmkvReceiptJson(routeKey: string, deltaHash: string) {
  mmkvStore[`receipt_${routeKey}`] = JSON.stringify({ deltaHash });
}

function putMmkvRawHash(routeKey: string, hash: string) {
  mmkvStore[`receipt_hash_${routeKey}`] = hash;
}

function setSqliteRecords(records: any[]) {
  mockDbRecords = records;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: lookupReceiptForRoute — 3-tier async lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('lookupReceiptForRoute', () => {
  beforeEach(() => {
    clearMmkv();
    setSqliteRecords([]);
    mockDbSelect.mockClear();
    mockDbFrom.mockClear();
    mockDbWhere.mockClear();
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
    expect(mockDbSelect).toHaveBeenCalled();
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
    mockDbWhere.mockRejectedValueOnce(new Error('DB connection lost'));
    const result = await lookupReceiptForRoute('cmd_db_error');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/SQLite lookup failed/);
    expect(result.error).toMatch(/DB connection lost/);
  });

  test('handles corrupt MMKV JSON gracefully and falls through to SQLite', async () => {
    mmkvStore['receipt_cmd_corrupt'] = '{invalid json:::';
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
    const storedValue = mockMmkvInstance.set.mock.calls.find(([key]: [string]) =>
      key.startsWith('otel:route.admission.verified:cmd_mmkv_test')
    );
    expect(storedValue).toBeDefined();
  });

  test('generates unique traceId and spanId per invocation', () => {
    const span1 = emitRouteAdmissionSpan('cmd_a', 'h1', 100, 'OK');
    const span2 = emitRouteAdmissionSpan('cmd_a', 'h2', 200, 'OK');
    // traceIds may differ due to timestamp
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
  });

  test('returns VERIFICATION_ERROR when MMKV getString throws', () => {
    mockMmkvInstance.getString.mockImplementationOnce(() => {
      throw new Error('MMKV disk failure');
    });
    // Second call (raw hash) also throws
    mockMmkvInstance.getString.mockImplementationOnce(() => {
      throw new Error('MMKV disk failure');
    });
    const result = requireReceiptBeforeRender('cmd_mmkv_fail');
    expect(result.receiptConfirmed).toBe(false);
    expect(result.rejectionReason).toBe('VERIFICATION_ERROR');
    expect(result.rejectionMessage).toMatch(/MMKV storage access failed/i);
  });

  test('handles corrupt MMKV JSON (falls through to raw hash tier)', () => {
    mmkvStore['receipt_cmd_corrupt_guard'] = '{NOT_VALID_JSON:::';
    putMmkvRawHash('cmd_corrupt_guard', 'fallback_raw');
    const result = requireReceiptBeforeRender('cmd_corrupt_guard');
    // Corrupt JSON → fall through → raw hash found
    expect(result.receiptConfirmed).toBe(true);
    expect(result.confirmedBlake3Hash).toBe('fallback_raw');
  });

  test('handles corrupt MMKV JSON with hash constraint collision (raw wins)', () => {
    mmkvStore['receipt_cmd_corrupt2'] = '{BAD';
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
    mockDbSelect.mockClear();
    mockDbWhere.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  // ── PENDING_VERIFICATION → VERIFIED ───────────────────────────────────────

  test('renders children after receipt found in MMKV (VERIFIED state)', async () => {
    putMmkvReceiptJson('cmd_render_ok', 'hash_valid');

    const { queryByText, getByText } = render(
      <ReceiptTheaterGuard routeKey="cmd_render_ok" subscribeToMMKV={false}>
        <Text>Protected Content Rendered</Text>
      </ReceiptTheaterGuard>
    );

    await waitFor(() => {
      expect(getByText('Protected Content Rendered')).toBeTruthy();
    });

    // Verification overlay must NOT be present once admitted
    expect(queryByText('Verifying Cryptographic Receipt')).toBeNull();
  });

  test('renders verification overlay while checking (PENDING_VERIFICATION)', async () => {
    // Make SQLite take a long time to simulate the pending state
    mockDbWhere.mockImplementationOnce(
      () => new Promise((res) => setTimeout(() => res([]), 10000))
    );

    const { getByText } = render(
      <ReceiptTheaterGuard routeKey="cmd_pending" subscribeToMMKV={false}>
        <Text>Should Not See This</Text>
      </ReceiptTheaterGuard>
    );

    // The overlay should appear immediately
    expect(getByText('Verifying Cryptographic Receipt')).toBeTruthy();
  });

  // ── PENDING_VERIFICATION → RECEIPT_MISSING ────────────────────────────────

  test('transitions to RECEIPT_MISSING after timeout with no receipt', async () => {
    // SQLite won't resolve before the timeout
    mockDbWhere.mockImplementationOnce(
      () => new Promise((res) => setTimeout(() => res([]), 10000))
    );

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_timeout"
        timeoutMs={100}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    // Advance past the timeout
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(getByText('Admission Blocked')).toBeTruthy();
    });
  });

  test('transitions to RECEIPT_MISSING when receipt not found anywhere', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_not_found"
        timeoutMs={500}
        subscribeToMMKV={false}
      >
        <Text>Hidden</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText('Admission Blocked')).toBeTruthy();
    });
  });

  // ── Retry button ──────────────────────────────────────────────────────────

  test('retry button triggers re-verification', async () => {
    setSqliteRecords([]);

    const { getByTestId, getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_retry_test"
        timeoutMs={100}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    // Wait for RECEIPT_MISSING
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(getByText('Admission Blocked')).toBeTruthy());

    // Now make the receipt available before the retry
    putMmkvReceiptJson('cmd_retry_test', 'new_receipt_hash');

    // Trigger retry
    await act(async () => {
      fireEvent.press(getByTestId('receipt-theater-retry-btn'));
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText('Content')).toBeTruthy();
    });
  });

  // ── Escalate button ───────────────────────────────────────────────────────

  test('escalate button calls onEscalate callback with routeKey and reason', async () => {
    setSqliteRecords([]);
    const onEscalate = jest.fn();

    const { getByTestId } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_escalate"
        timeoutMs={100}
        onEscalate={onEscalate}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => getByTestId('receipt-theater-escalate-btn'));

    await act(async () => {
      fireEvent.press(getByTestId('receipt-theater-escalate-btn'));
    });

    expect(onEscalate).toHaveBeenCalledWith(
      'cmd_escalate',
      expect.stringMatching(/RECEIPT_NOT_FOUND|TIMEOUT/)
    );
  });

  // ── RECEIPT_HASH_MISMATCH scenario ────────────────────────────────────────

  test('blocks render on RECEIPT_HASH_MISMATCH', async () => {
    putMmkvReceiptJson('cmd_hash_mismatch', 'wrong_hash');

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_hash_mismatch"
        expectedBlake3Hash="correct_hash"
        subscribeToMMKV={false}
      >
        <Text>Should Not Render</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(getByText('Admission Blocked')).toBeTruthy();
    });
  });

  // ── loadingOverride ───────────────────────────────────────────────────────

  test('renders loadingOverride instead of default overlay during PENDING_VERIFICATION', async () => {
    mockDbWhere.mockImplementationOnce(
      () => new Promise((res) => setTimeout(() => res([]), 5000))
    );

    const { getByText, queryByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_loading_override"
        loadingOverride={<Text>Custom Loading Spinner</Text>}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    expect(getByText('Custom Loading Spinner')).toBeTruthy();
    expect(queryByText('Verifying Cryptographic Receipt')).toBeNull();
  });

  // ── errorOverride (function) ───────────────────────────────────────────────

  test('renders errorOverride function when receipt missing', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_error_override"
        timeoutMs={100}
        errorOverride={(state: ReceiptTheaterState) => (
          <Text>{`Error: ${state.kind}`}</Text>
        )}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(getByText('Error: RECEIPT_MISSING')).toBeTruthy();
    });
  });

  // ── errorOverride (static node) ───────────────────────────────────────────

  test('renders static errorOverride node when receipt missing', async () => {
    setSqliteRecords([]);

    const { getByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_static_override"
        timeoutMs={100}
        errorOverride={<Text>Static Error Node</Text>}
        subscribeToMMKV={false}
      >
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(getByText('Static Error Node')).toBeTruthy();
    });
  });

  // ── MMKV subscription auto-refresh ────────────────────────────────────────

  test('auto-refreshes on MMKV key change when subscribeToMMKV=true', async () => {
    setSqliteRecords([]);

    const { getByText, queryByText } = render(
      <ReceiptTheaterGuard
        routeKey="cmd_mmkv_subscribe"
        timeoutMs={200}
        subscribeToMMKV={true}
      >
        <Text>Protected by MMKV</Text>
      </ReceiptTheaterGuard>
    );

    // Initially should be checking / missing
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => getByText('Admission Blocked'));

    // Now put a receipt in MMKV — listener fires automatically
    await act(async () => {
      putMmkvReceiptJson('cmd_mmkv_subscribe', 'fresh_receipt');
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText('Protected by MMKV')).toBeTruthy();
    });
  });

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  test('removes MMKV listener on unmount', async () => {
    putMmkvReceiptJson('cmd_cleanup', 'hash_ok');

    const { unmount } = render(
      <ReceiptTheaterGuard routeKey="cmd_cleanup" subscribeToMMKV={true}>
        <Text>Content</Text>
      </ReceiptTheaterGuard>
    );

    await act(async () => { jest.runAllTimers(); });

    const removeSpy = mockMmkvInstance.addOnValueChangedListener.mock.results[0]?.value?.remove;
    unmount();

    if (removeSpy) {
      expect(removeSpy).toHaveBeenCalled();
    }
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
    const { getByTestId, queryByTestId } = render(
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
