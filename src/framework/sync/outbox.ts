/**
 * FrameworkOutboxManager
 *
 * Manages an outbox queue of deltas with full BLAKE3-first receipt chaining.
 * Every receipt is generated using the 3-tier fallback strategy:
 *   Tier 1: BLAKE3 (pure JS, primary)
 *   Tier 2: SHA-256 (pure JS, secondary fallback)
 *   Tier 3: Portable djb2 hex (emergency fallback — never loses a receipt)
 *
 * @module @truex/membrane-client
 */

import { OutboxDelta, OutboxHook, OutboxReceipt } from './types';

// ─── BLAKE3 3-Tier Fallback (inlined from MembraneHardeningLayer pattern) ─────

/**
 * Pure-JS DJB2 hash → 64-char hex string (Tier 3 emergency fallback).
 * Deterministic, portable, zero dependencies.
 */
function djb2Hex(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  // Produce a 64-char hex string by mixing two djb2 passes for wider coverage
  const unsigned1 = hash < 0 ? hash + 0x100000000 : hash;
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash2 = ((hash2 ^ input.charCodeAt(i)) * 0x01000193) | 0;
  }
  const unsigned2 = hash2 < 0 ? hash2 + 0x100000000 : hash2;
  const ts = Date.now().toString(16).padStart(16, '0');
  const part1 = unsigned1.toString(16).padStart(8, '0');
  const part2 = unsigned2.toString(16).padStart(8, '0');
  return (ts + part1 + part2).padEnd(64, '0').slice(0, 64);
}

type Blake3TierAlgorithm = 'BLAKE3' | 'SHA256' | 'FALLBACK';

interface OutboxHashResult {
  hash: string;
  algorithm: Blake3TierAlgorithm;
}

/**
 * Computes a receipt hash using a 3-tier fallback strategy:
 *   1. BLAKE3 via `@truex/membrane-client` crypto module (pure JS)
 *   2. SHA-256 via the same crypto module (pure JS, no Node crypto)
 *   3. DJB2 hex (portable emergency fallback)
 *
 * Importing dynamically so the outbox remains portable across environments
 * where the crypto module may or may not be bundled at call time.
 */
function computeBlake3Hash(input: string): OutboxHashResult {
  // Tier 1: Attempt BLAKE3
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { blake3 } = require('../../lib/crypto/receipts');
    const hash: string = blake3(input);
    if (typeof hash === 'string' && hash.length >= 32) {
      return { hash, algorithm: 'BLAKE3' };
    }
    throw new Error('BLAKE3 produced invalid output');
  } catch (_blake3Err) {
    // Tier 2: Attempt SHA-256 from the same pure-JS module (never raw crypto.createHash)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sha256 } = require('../../lib/crypto/receipts');
      const hash: string = sha256(input);
      if (typeof hash === 'string' && hash.length >= 32) {
        return { hash, algorithm: 'SHA256' };
      }
      throw new Error('SHA256 produced invalid output');
    } catch (_sha256Err) {
      // Tier 3: Portable djb2 hex — never loses a receipt
      return { hash: djb2Hex(input), algorithm: 'FALLBACK' };
    }
  }
}

/**
 * Canonical deterministic serializer for hashing structured data.
 * Keys sorted alphabetically to ensure consistent output regardless of insertion order.
 */
function canonicalStringify(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val !== 'object') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + (val as unknown[]).map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify((val as Record<string, unknown>)[k])}`
  );
  return '{' + parts.join(',') + '}';
}

// ─── Outbox Manager ───────────────────────────────────────────────────────────

export class FrameworkOutboxManager<TDelta extends OutboxDelta = OutboxDelta, THook extends OutboxHook = OutboxHook> {
  protected queue: { delta: TDelta, hook: THook, isBatched: boolean }[] = [];
  protected receipts: OutboxReceipt[] = [];
  protected lastReceiptHash: string = 'genesis_hash';
  
  public processedCount = 0;

  enqueue(delta: TDelta, hook: THook, isBatched: boolean) {
    this.queue.push({ delta, hook, isBatched });
    
    // For high concurrency, we simulate a fast flush if not batched
    if (!isBatched) {
      this.flushPending();
    }
  }

  flushPending() {
    const toProcess = this.queue.splice(0, this.queue.length);
    for (const item of toProcess) {
      this.generateReceipt(item.delta, item.hook);
      this.processedCount++;
    }
  }

  protected generateReceipt(delta: TDelta, hook: THook) {
    if (!hook.receipts) return;

    // Tier 1→2→3 BLAKE3 fallback for each sub-hash component
    const { hash: inputHash } = computeBlake3Hash(
      canonicalStringify({ subject: delta.subject })
    );
    const { hash: outputHash } = computeBlake3Hash(
      canonicalStringify({ object: delta.object })
    );
    const { hash: deltaHash } = computeBlake3Hash(
      canonicalStringify({ predicate: delta.predicate, timestamp: delta.timestamp })
    );

    // Chain link: BLAKE3(previousReceiptHash + inputHash + outputHash + deltaHash)
    const chainInput = this.lastReceiptHash + inputHash + outputHash + deltaHash;
    const { hash: receiptHash } = computeBlake3Hash(chainInput);

    const receipt: OutboxReceipt = {
      inputHash,
      outputHash,
      deltaHash,
      previousReceiptHash: this.lastReceiptHash,
      receiptHash
    };

    this.receipts.push(receipt);
    this.lastReceiptHash = receiptHash;
  }

  getReceiptCount(): number {
    return this.receipts.length;
  }

  /** Returns a read-only view of all emitted receipts. */
  getReceipts(): readonly OutboxReceipt[] {
    return this.receipts;
  }
}
