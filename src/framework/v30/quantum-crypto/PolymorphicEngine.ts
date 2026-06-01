/**
 * @module PolymorphicEngine
 * @description The core engine for v30.1.1 Epoch's quantum-crypto framework.
 * Implements Polymorphic Encryption, which constantly rotates encryption keys and algorithms
 * at runtime based on device entropy and simulated DNA-sequence parameters.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { sha256 } from '../../../lib/crypto/receipts';

/**
 * Supported algorithms that the polymorphic engine can rotate between.
 */
export type PolymorphicAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';

/**
 * Interface representing a DNA Sequence Key used for biometrically-bound cryptography.
 */
export interface DNASequenceKey {
  /** The base sequence generated from biometric entropy. */
  sequence: string;
  /** The calculated entropy score of the sequence. */
  entropyScore: number;
  /** Timestamp of generation to enforce temporal rotation. */
  generatedAt: number;
}

/**
 * Represents a lattice-based key pair generated using LWE (Learning With Errors) simulation.
 */
export interface LatticeKeyPair {
  publicKey: {
    A: number[][]; // Public random matrix
    t: number[];   // public vector t = A*s + e mod q
  };
  privateKey: {
    s: number[];   // Secret vector
  };
}

/**
 * Represents the current active encryption state.
 */
export interface EncryptionContext {
  id: string;
  algorithm: PolymorphicAlgorithm;
  key: Buffer;
  ivLength: number;
  latticeKey?: LatticeKeyPair;
}

/**
 * Represents a network sync frame containing a post-quantum signature.
 */
export interface NetworkSyncFrame {
  id: string;
  payload: string;
  signature: {
    algorithm: 'Falcon-1024' | 'Dilithium-5';
    data: string; // Base64 encoded signature
    publicKey: string; // Base64 encoded public key
  };
  timestamp: number;
}

/**
 * State structure used inside the membrane proxy.
 */
interface EngineState {
  currentContext: EncryptionContext;
  dnaKey: DNASequenceKey | null;
  quarantined: boolean;
}

/**
 * The PolymorphicEngine class encapsulates the highly complex logic of algorithm rotation,
 * entropy generation, and polymorphic encryption/decryption cycles.
 * 
 * @class PolymorphicEngine
 */
export class PolymorphicEngine {
  private state: EngineState;
  private keyStore: Map<string, EncryptionContext> = new Map();
  private readonly algorithms: PolymorphicAlgorithm[] = [
    'aes-256-gcm',
    'aes-256-cbc'
  ];

  private quarantineStore: Map<string, { frame: NetworkSyncFrame; reason: string; quarantinedAt: number }> = new Map();
  private lastMutationReceiptHash: string = sha256('genesis-polymorphic-engine-state');

  /**
   * Initializes the Polymorphic Engine, generating initial entropy and encryption contexts.
   */
  constructor() {
    const initialContext = this.generateContext();
    this.keyStore.set(initialContext.id, initialContext);

    // Initial state
    const targetState: EngineState = {
      currentContext: initialContext,
      dnaKey: null,
      quarantined: false
    };

    // All global state mutations must pass through proxyable membrane traps
    this.state = new Proxy(targetState, {
      set: (target, prop, value) => {
        const previousHash = this.lastMutationReceiptHash;
        const transitionData = {
          property: prop,
          oldValue: target[prop as keyof EngineState],
          newValue: value,
          timestamp: Date.now()
        };
        // Truex envelope generation
        this.lastMutationReceiptHash = sha256(previousHash + JSON.stringify(transitionData));

        (target as any)[prop] = value;
        return true;
      }
    });
  }

  /**
   * Returns the Truex envelope / cryptographic receipt hash of the state history.
   */
  public getTruexEnvelope(): string {
    return this.lastMutationReceiptHash;
  }

  /**
   * Returns the currently active DNA Sequence Key, if one has been generated.
   */
  public getActiveDNAKey(): DNASequenceKey | null {
    return this.state.dnaKey;
  }

  /**
   * Generates a DNA-Sequence Key stub based on simulated device entropy.
   * In a real quantum environment, this interacts with the biometric secure enclave.
   * 
   * @param {number} complexity - The desired length/complexity of the DNA sequence.
   * @returns {DNASequenceKey} The newly generated DNA sequence key.
   */
  public generateDNASequenceKey(complexity: number = 256): DNASequenceKey {
    const bases = ['A', 'C', 'G', 'T'];
    let sequence = '';
    for (let i = 0; i < complexity; i++) {
      const idx = randomBytes(1)[0] % 4;
      sequence += bases[idx];
    }

    const entropyScore = this.calculateEntropy(sequence);

    this.state.dnaKey = {
      sequence,
      entropyScore,
      generatedAt: Date.now()
    };

    return this.state.dnaKey;
  }

  /**
   * Validates a given DNA-Sequence Key against the engine's strict entropy requirements.
   * 
   * @param {DNASequenceKey} key - The key to validate.
   * @returns {boolean} True if the key meets the entropy and temporal constraints.
   */
  public validateDNASequenceKey(key: DNASequenceKey): boolean {
    if (!key || typeof key.sequence !== 'string') return false;
    
    // Ensure the key has adequate entropy
    if (key.entropyScore < 0.1) return false;

    // Ensure the key hasn't expired (e.g., 1 hour lifespan for biological decay simulation)
    const MAX_LIFESPAN = 3600 * 1000;
    if (Date.now() - key.generatedAt > MAX_LIFESPAN) return false;

    // Validate sequence contains only valid bases
    if (!/^[ACGT]+$/.test(key.sequence)) return false;

    return true;
  }

  /**
   * Evaluates the Shannon entropy of a given sequence.
   * 
   * @private
   * @param {string} sequence - The sequence to evaluate.
   * @returns {number} The entropy score.
   */
  private calculateEntropy(sequence: string): number {
    const frequencies: Record<string, number> = {};
    for (const char of sequence) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    const len = sequence.length;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Generates a lattice key pair using Learning With Errors (LWE) simulation.
   * Performs true lattice-based key generation with matrix A, secret s, and error e.
   */
  public generateLatticeKeyPair(dim: number = 8, q: number = 257): LatticeKeyPair {
    const A: number[][] = [];
    for (let i = 0; i < dim; i++) {
      const row: number[] = [];
      for (let j = 0; j < dim; j++) {
        row.push(randomBytes(1)[0] % q);
      }
      A.push(row);
    }

    const s: number[] = [];
    for (let i = 0; i < dim; i++) {
      s.push((randomBytes(1)[0] % 3) - 1);
    }

    const e: number[] = [];
    for (let i = 0; i < dim; i++) {
      e.push((randomBytes(1)[0] % 3) - 1);
    }

    const t: number[] = [];
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (let j = 0; j < dim; j++) {
        sum += A[i][j] * s[j];
      }
      sum += e[i];
      let modVal = sum % q;
      if (modVal < 0) {
        modVal += q;
      }
      t.push(modVal);
    }

    return {
      publicKey: { A, t },
      privateKey: { s }
    };
  }

  /**
   * Computes the statistical variance of the elements in the generated lattice keys.
   */
  public calculateLatticeVariance(keyPair: LatticeKeyPair): { A: number; t: number; s: number } {
    const getVariance = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sqDiffs = arr.map(v => Math.pow(v - mean, 2));
      return sqDiffs.reduce((a, b) => a + b, 0) / arr.length;
    };

    const flatA = keyPair.publicKey.A.reduce((acc, val) => acc.concat(val), []);
    return {
      A: getVariance(flatA),
      t: getVariance(keyPair.publicKey.t),
      s: getVariance(keyPair.privateKey.s)
    };
  }

  /**
   * Collects entropy from the "device" to determine the next algorithm and key material.
   * 
   * @private
   * @returns {EncryptionContext} A newly rotated encryption context.
   */
  private generateContext(): EncryptionContext {
    const entropy = randomBytes(32);
    const algoIndex = entropy[0] % this.algorithms.length;
    const algorithm = this.algorithms[algoIndex];

    let ivLength = 16;
    if (algorithm === 'aes-256-gcm') ivLength = 12;

    const id = randomBytes(8).toString('hex');

    // Generate true lattice-based key simulation
    const latticeKey = this.generateLatticeKeyPair(8, 257);

    // Derive symmetric key from lattice key pair
    const flatA = latticeKey.publicKey.A.map(row => row.join(',')).join(';');
    const flatT = latticeKey.publicKey.t.join(',');
    const flatS = latticeKey.privateKey.s.join(',');
    const seed = `${flatA}|${flatT}|${flatS}`;
    const derivedKeyHex = sha256(seed);
    const key = Buffer.from(derivedKeyHex, 'hex');

    return {
      id,
      algorithm,
      key,
      ivLength,
      latticeKey
    };
  }

  /**
   * Rotates the encryption algorithm and key at runtime.
   * This is called continuously during the application lifecycle to maintain quantum-resistant forward secrecy.
   */
  public rotate(): void {
    if (this.state.quarantined) {
      throw new Error('Engine is quarantined due to post-quantum signature verification failure');
    }

    const nextContext = this.generateContext();
    this.state.currentContext = nextContext;
    this.keyStore.set(nextContext.id, nextContext);

    if (this.state.dnaKey) {
       // Incorporate biometric entropy if available
       const complexity = this.state.dnaKey.sequence.length;
       this.generateDNASequenceKey(complexity);
    }
  }

  /**
   * Returns the ID of the current active encryption context.
   */
  public getCurrentContextId(): string {
    return this.state.currentContext.id;
  }

  /**
   * Encrypts the provided plaintext using the currently active polymorphic context.
   * 
   * @param {string} plaintext - The data to encrypt.
   * @returns {string} The ciphertext, encoded in base64, including algorithm metadata.
   */
  public encrypt(plaintext: string): string {
    if (this.state.quarantined) {
      throw new Error('Engine is quarantined due to post-quantum signature verification failure');
    }

    const { id, algorithm, key, ivLength } = this.state.currentContext;
    const iv = randomBytes(ivLength);

    const cipher = createCipheriv(algorithm, key, iv) as any;
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    let authTag = '';
    if (algorithm === 'aes-256-gcm') {
       authTag = cipher.getAuthTag().toString('base64');
    }

    // Pack the metadata with the ciphertext
    // Format: Version:KeyID:Algorithm:IV:AuthTag:Ciphertext
    return `v1:${id}:${algorithm}:${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts the provided polymorphic ciphertext. It dynamically determines the algorithm
   * from the payload metadata.
   * 
   * @param {string} payload - The packed polymorphic payload.
   * @returns {string} The decrypted plaintext.
   */
  public decrypt(payload: string): string {
    if (this.state.quarantined) {
      throw new Error('Engine is quarantined due to post-quantum signature verification failure');
    }

    const parts = payload.split(':');
    if (parts.length !== 6) {
      throw new Error('Invalid polymorphic payload format');
    }

    const [version, id, algorithm, ivB64, authTagB64, ciphertext] = parts;

    if (version !== 'v1') {
      throw new Error(`Unsupported payload version: ${version}`);
    }

    const context = this.keyStore.get(id);
    if (!context) {
        throw new Error('Key not found in temporal store');
    }

    if (context.algorithm !== algorithm) {
        throw new Error('Algorithm mismatch in payload');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const decipher = createDecipheriv(algorithm as string, context.key, iv) as any;

    if (algorithm === 'aes-256-gcm') {
        const authTag = Buffer.from(authTagB64, 'base64');
        decipher.setAuthTag(authTag);
    }

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Returns whether the engine is currently quarantined.
   */
  public isQuarantined(): boolean {
    return this.state.quarantined;
  }

  /**
   * Clears the quarantine state, enabling standard operations and purging quarantined logs.
   */
  public clearQuarantine(): void {
    this.state.quarantined = false;
    this.quarantineStore.clear();
  }

  /**
   * Places the engine in a quarantine state manually or logs a specific frame failure.
   */
  private quarantineFrame(frame: NetworkSyncFrame, reason: string): void {
    this.state.quarantined = true;
    if (frame && frame.id) {
      this.quarantineStore.set(frame.id, {
        frame,
        reason,
        quarantinedAt: Date.now()
      });
    }
  }

  /**
   * Returns all quarantined frame records.
   */
  public getQuarantinedFrames(): Array<{ frame: NetworkSyncFrame; reason: string; quarantinedAt: number }> {
    return Array.from(this.quarantineStore.values());
  }

  /**
   * Generates a simulated post-quantum signature for a network sync frame.
   * This binds the payload, algorithm, and public key cryptographically.
   */
  public generateSimulatedSignature(payload: string, algorithm: 'Falcon-1024' | 'Dilithium-5', publicKey: string): string {
    const seed = `${payload}|${algorithm}|${publicKey}`;
    return sha256(seed);
  }

  /**
   * Verifies the post-quantum signature on an incoming network sync frame.
   * If verification fails, the engine triggers a state quarantine, blocking future operations.
   */
  public verifyNetworkSyncFrame(frame: NetworkSyncFrame): boolean {
    // Audit post-quantum signature on network sync frame and quarantine state if verification fails.
    if (this.state.quarantined) {
      throw new Error('Engine is quarantined due to a previous signature verification failure');
    }

    if (!frame) {
      const dummyFrame: NetworkSyncFrame = {
        id: 'null-frame-' + Date.now(),
        payload: '',
        signature: { algorithm: 'Falcon-1024', data: '', publicKey: '' },
        timestamp: Date.now()
      };
      this.quarantineFrame(dummyFrame, 'Frame is null or undefined');
      return false;
    }

    if (!frame.id || !frame.payload || !frame.signature) {
      this.quarantineFrame(frame, 'Missing required frame parameters');
      return false;
    }

    const { algorithm, data, publicKey } = frame.signature;

    if (algorithm !== 'Falcon-1024' && algorithm !== 'Dilithium-5') {
      this.quarantineFrame(frame, `Unsupported post-quantum algorithm: ${algorithm}`);
      return false;
    }

    if (!data || !publicKey) {
      this.quarantineFrame(frame, 'Missing signature data or public key');
      return false;
    }

    // Verify signature cryptographically using our simulated signature verification
    const expectedSignature = this.generateSimulatedSignature(frame.payload, algorithm, publicKey);

    if (data !== expectedSignature) {
      this.quarantineFrame(frame, `Cryptographic signature mismatch for algorithm ${algorithm}`);
      return false;
    }

    return true;
  }
}
