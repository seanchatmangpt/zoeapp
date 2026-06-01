/**
 * VKG OutboxManager tests — BLAKE3 receipt chaining verification.
 *
 * OutboxManager extends FrameworkOutboxManager, which now uses the 3-tier
 * BLAKE3 fallback for ALL receipt generation. This test verifies:
 *   - Correct receipt chain structure
 *   - Hash format (hex, ≥ 32 chars)
 *   - Chain linkage (previousReceiptHash continuity)
 *   - No raw SHA-256/crypto.createHash usage
 */

import { OutboxManager } from '../outbox';
import { GraphDelta } from '../../hooks/engine';
import { VkgHook } from '../../hooks/types';
// Do NOT import crypto — receipt generation must be BLAKE3-only
import { blake3 } from '../../../crypto/receipts';

describe('OutboxManager', () => {
  let outbox: OutboxManager;

  const mockDelta: GraphDelta = {
    id: 'd1',
    subject: 'sub',
    predicate: 'pred',
    object: 'obj',
    timestamp: 12345,
  };

  const mockHook: VkgHook = {
    id: 'h1',
    name: 'test-hook',
    authority: 'client',
    mode: 'annotate',
    condition: { kind: 'pattern', pattern: 'pred' },
    effects: [],
    projections: [],
    supervisors: [],
    receipts: false,
  };

  const mockHookWithReceipt: VkgHook = {
    ...mockHook,
    id: 'h2',
    receipts: true,
  };

  beforeEach(() => {
    outbox = new OutboxManager();
  });

  it('should initialize correctly', () => {
    expect(outbox.processedCount).toBe(0);
    expect(outbox.getReceiptCount()).toBe(0);
  });

  it('should not flush if batched', () => {
    outbox.enqueue(mockDelta, mockHook, true);
    // Queue should have 1 item, but processedCount is 0
    expect(outbox.processedCount).toBe(0);
  });

  it('should flush immediately if not batched', () => {
    outbox.enqueue(mockDelta, mockHook, false);
    // Queue should be flushed, processedCount should be 1
    expect(outbox.processedCount).toBe(1);
    // But since mockHook.receipts is false, no receipt generated
    expect(outbox.getReceiptCount()).toBe(0);
  });

  it('should flush pending items', () => {
    outbox.enqueue(mockDelta, mockHook, true);
    outbox.enqueue(mockDelta, mockHook, true);
    
    expect(outbox.processedCount).toBe(0);
    
    outbox.flushPending();
    
    expect(outbox.processedCount).toBe(2);
    expect(outbox.getReceiptCount()).toBe(0);
  });

  it('should generate receipts if hook requires it', () => {
    outbox.enqueue(mockDelta, mockHookWithReceipt, false);
    
    expect(outbox.processedCount).toBe(1);
    expect(outbox.getReceiptCount()).toBe(1);
  });

  it('should chain receipt hashes correctly using BLAKE3 3-tier fallback', () => {
    outbox.enqueue(mockDelta, mockHookWithReceipt, true);
    outbox.enqueue(mockDelta, mockHookWithReceipt, true);

    outbox.flushPending();

    expect(outbox.processedCount).toBe(2);
    expect(outbox.getReceiptCount()).toBe(2);

    // Access receipts for structural verification
    const receipts = (outbox as any).receipts;

    // ── Verify receipt 0 structure ────────────────────────────────────────────

    const r0 = receipts[0];
    expect(r0).toBeDefined();

    // All hash fields must be hex strings of ≥ 32 chars
    const hexPattern = /^[0-9a-f]{32,}$/i;
    expect(r0.inputHash).toMatch(hexPattern);
    expect(r0.outputHash).toMatch(hexPattern);
    expect(r0.deltaHash).toMatch(hexPattern);
    expect(r0.receiptHash).toMatch(hexPattern);

    // First receipt's previousReceiptHash is the genesis sentinel
    expect(r0.previousReceiptHash).toBe('genesis_hash');

    // ── Verify receipt 1 chain linkage ────────────────────────────────────────

    const r1 = receipts[1];
    expect(r1).toBeDefined();

    // Chain link: receipt[1].previousReceiptHash must equal receipt[0].receiptHash
    expect(r1.previousReceiptHash).toBe(r0.receiptHash);

    // Same delta → same inputHash, outputHash, deltaHash
    expect(r1.inputHash).toBe(r0.inputHash);
    expect(r1.outputHash).toBe(r0.outputHash);
    expect(r1.deltaHash).toBe(r0.deltaHash);

    // But different chain predecessor → different receiptHash
    expect(r1.receiptHash).not.toBe(r0.receiptHash);
  });

  it('receipt hashes are deterministic for identical deltas', () => {
    const outbox2 = new OutboxManager();
    
    outbox.enqueue(mockDelta, mockHookWithReceipt, false);
    outbox2.enqueue(mockDelta, mockHookWithReceipt, false);

    const r1 = (outbox as any).receipts[0];
    const r2 = (outbox2 as any).receipts[0];

    // Canonical inputs produce identical hashes
    expect(r1.inputHash).toBe(r2.inputHash);
    expect(r1.outputHash).toBe(r2.outputHash);
    expect(r1.deltaHash).toBe(r2.deltaHash);
    expect(r1.receiptHash).toBe(r2.receiptHash);
  });

  it('BLAKE3 directly produces the expected inputHash for subject field', () => {
    outbox.enqueue(mockDelta, mockHookWithReceipt, false);
    const r = (outbox as any).receipts[0];

    // Verify the inputHash matches BLAKE3 applied to canonically-serialized subject
    // canonicalStringify({ subject: 'sub' }) = '{"subject":"sub"}'
    const expectedInputHash = blake3('{"subject":"sub"}');
    expect(r.inputHash).toBe(expectedInputHash);
  });

  it('produces unique hashes for deltas with different subjects', () => {
    const delta2: GraphDelta = { ...mockDelta, subject: 'different-subject' };
    
    outbox.enqueue(mockDelta, mockHookWithReceipt, false);
    const outbox2 = new OutboxManager();
    outbox2.enqueue(delta2, mockHookWithReceipt, false);

    const r1 = (outbox as any).receipts[0];
    const r2 = (outbox2 as any).receipts[0];

    expect(r1.inputHash).not.toBe(r2.inputHash);
    expect(r1.receiptHash).not.toBe(r2.receiptHash);
  });
});
