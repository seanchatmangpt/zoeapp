/**
 * RealityReceipts — BLAKE3-first receipt generation and verification.
 *
 * Implements the Receipted Chatman Equation: R ⊢ A = μ(O*)
 * All receipts use BLAKE3 (3-tier fallback: BLAKE3 → SHA256 pure-JS → djb2 hex).
 * Raw crypto.createHash is NEVER used — all hashing goes through the membrane
 * crypto module which is portable across JS environments.
 *
 * @module @truex/membrane-client
 */

import { blake3, sha256, canonicalStringify } from '../../../../lib/crypto/receipts';

export interface ZKPIdentity {
  proof: string;
  publicSignals: string[];
}

export interface HardwareTelemetry {
  deviceId: string;
  cpuCores: number;
  memoryCapacity: number;
  secureEnclavePresent: boolean;
}

export interface BehavioralIntent {
  action: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface RealityReceiptData {
  zkpIdentity: ZKPIdentity;
  hardwareTelemetry: HardwareTelemetry;
  behavioralIntent: BehavioralIntent;
}

export interface RealityReceipt {
  version: "1.0.0";
  data: RealityReceiptData;
  /** BLAKE3-keyed signature binding the receipt to the system secret. */
  signature: string;
  /** BLAKE3 hash of the canonical serialized data. */
  hash: string;
  /** The hash algorithm tier that was used. */
  hashAlgorithm: 'BLAKE3' | 'SHA256' | 'FALLBACK';
}

// ─── BLAKE3 3-Tier Fallback ───────────────────────────────────────────────────

type HashAlgorithmTier = 'BLAKE3' | 'SHA256' | 'FALLBACK';

/** Portable djb2 hash — Tier 3 emergency fallback. */
function djb2Hex(input: string): string {
  let h1 = 5381;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = (((h1 << 5) + h1) + c) | 0;
    h2 = ((h2 ^ c) * 0x01000193) | 0;
  }
  const ts = Date.now().toString(16).padStart(16, '0');
  const p1 = (h1 < 0 ? h1 + 0x100000000 : h1).toString(16).padStart(8, '0');
  const p2 = (h2 < 0 ? h2 + 0x100000000 : h2).toString(16).padStart(8, '0');
  return (ts + p1 + p2).padEnd(64, '0').slice(0, 64);
}

function computeBlake3Hash(input: string): { hash: string; algorithm: HashAlgorithmTier } {
  try {
    const h = blake3(input);
    if (h && h.length >= 32) return { hash: h, algorithm: 'BLAKE3' };
    throw new Error('BLAKE3 produced invalid output');
  } catch {
    try {
      const h = sha256(input);
      if (h && h.length >= 32) return { hash: h, algorithm: 'SHA256' };
      throw new Error('SHA256 produced invalid output');
    } catch {
      return { hash: djb2Hex(input), algorithm: 'FALLBACK' };
    }
  }
}

/**
 * BLAKE3-keyed signing: blake3(key + data).
 * Provides MAC-like binding between the system secret and the hash,
 * without relying on Node.js crypto.createHmac.
 */
function blake3KeyedSign(key: string, data: string): string {
  const { hash } = computeBlake3Hash(key + ':' + data);
  return hash;
}

// ─── RealityReceiptGenerator ──────────────────────────────────────────────────

export class RealityReceiptGenerator {
  private readonly systemSecret: string;

  constructor(systemSecret: string) {
    if (!systemSecret) {
      throw new Error("System secret is required for unforgeable artifact generation");
    }
    this.systemSecret = systemSecret;
  }

  public generate(data: RealityReceiptData): RealityReceipt {
    this.validateData(data);
    const serializedData = canonicalStringify(data);
    const { hash, algorithm } = computeBlake3Hash(serializedData);
    const signature = blake3KeyedSign(this.systemSecret, hash);

    return {
      version: "1.0.0",
      data,
      hash,
      signature,
      hashAlgorithm: algorithm,
    };
  }

  public verifyReality(receipt: RealityReceipt): boolean {
    if (!receipt || receipt.version !== "1.0.0") {
      return false;
    }

    try {
      this.validateData(receipt.data);
    } catch {
      return false;
    }

    const serializedData = canonicalStringify(receipt.data);
    const { hash: expectedHash } = computeBlake3Hash(serializedData);

    if (expectedHash !== receipt.hash) {
      return false;
    }

    const expectedSignature = blake3KeyedSign(this.systemSecret, expectedHash);

    // Constant-time comparison without Node.js Buffer.timingSafeEqual
    if (expectedSignature.length !== receipt.signature.length) {
      return false;
    }
    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ receipt.signature.charCodeAt(i);
    }
    return mismatch === 0;
  }

  public serialize(receipt: RealityReceipt): string {
    return JSON.stringify(receipt);
  }

  public deserialize(payload: string): RealityReceipt {
    const parsed = JSON.parse(payload) as RealityReceipt;
    if (!parsed || !parsed.version || !parsed.data || !parsed.signature || !parsed.hash) {
      throw new Error("Invalid RealityReceipt payload");
    }
    return parsed;
  }

  private validateData(data: RealityReceiptData): void {
    if (!data) {
      throw new Error("Data is undefined");
    }
    if (!data.zkpIdentity || typeof data.zkpIdentity.proof !== 'string' || !Array.isArray(data.zkpIdentity.publicSignals)) {
      throw new Error("Invalid ZKPIdentity");
    }
    if (!data.hardwareTelemetry || typeof data.hardwareTelemetry.deviceId !== 'string') {
      throw new Error("Invalid HardwareTelemetry");
    }
    if (!data.behavioralIntent || typeof data.behavioralIntent.action !== 'string' || typeof data.behavioralIntent.timestamp !== 'number') {
      throw new Error("Invalid BehavioralIntent");
    }
  }
}
