import { PostQuantumZkEngine } from '../PostQuantumZkEngine';
import { ZkClaim } from '../../../auth/zkp/types';
import { PqZkProof, PqSignature, PqReceipt } from '../types';
import { pqZkEngine } from '../index';

describe('PostQuantumZkEngine', () => {
  let engine: PostQuantumZkEngine;
  const mockClaim: ZkClaim = {
    id: 'claim-123',
    field: 'age',
    operator: 'GTE',
    threshold: 18
  };

  beforeEach(() => {
    engine = new PostQuantumZkEngine();
  });

  it('should export a singleton instance', () => {
    expect(pqZkEngine).toBeInstanceOf(PostQuantumZkEngine);
  });

  it('should verify a standard ZK proof', async () => {
    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18']
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(true);
    expect(result.pqVerified).toBe(false);
    expect(result.quantumResistant).toBe(false);
  });

  it('should verify a proof with PQ signature', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Dilithium5',
      data: 'valid-signature',
      publicKey: 'valid-pubkey'
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      pqSignature
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(true);
    expect(result.pqVerified).toBe(true);
    expect(result.quantumResistant).toBe(true);
  });

  it('should fail if PQ signature is invalid', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Dilithium5',
      data: 'INVALID_SIG',
      publicKey: 'valid-pubkey'
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      pqSignature
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(false);
    expect(result.pqVerified).toBe(false);
  });

  it('should fail if PQ signature data is missing', async () => {
    const pqSignature: any = {
      algorithm: 'Dilithium5',
      publicKey: 'valid-pubkey'
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      pqSignature
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.pqVerified).toBe(false);
  });

  it('should verify a proof with PQ receipt', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Falcon-1024',
      data: 'valid-signature',
      publicKey: 'valid-pubkey'
    };

    const receipt: PqReceipt = {
      version: '2030.1',
      timestamp: Date.now(),
      claimId: 'claim-123',
      zkProofHash: 'hash-123',
      pqSignature
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      receipt
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(true);
    expect(result.receiptVerified).toBe(true);
  });

  it('should fail if PQ receipt version is invalid', async () => {
    const receipt: any = {
      version: '2025.1',
      pqSignature: {
        algorithm: 'Dilithium2',
        data: 'valid',
        publicKey: 'valid'
      }
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      receipt
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.receiptVerified).toBe(false);
  });

  it('should fail standard verification if claimId mismatch', async () => {
    const proof: PqZkProof = {
      claimId: 'wrong-claim',
      proofData: 'mock-proof-data',
      publicSignals: ['18']
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(false);
    expect(result.error).toBe('Proof claimId mismatch');
  });

  it('should fail if standard verification fails even if PQ signature is valid', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Dilithium5',
      data: 'valid-signature',
      publicKey: 'valid-pubkey'
    };

    const proof: PqZkProof = {
      claimId: 'wrong-claim',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      pqSignature
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(false);
    expect(result.pqVerified).toBe(true);
  });

  it('should verify a proof with ONLY PQ receipt', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Falcon-1024',
      data: 'valid-signature',
      publicKey: 'valid-pubkey'
    };

    const receipt: PqReceipt = {
      version: '2030.1',
      timestamp: Date.now(),
      claimId: 'claim-123',
      zkProofHash: 'hash-123',
      pqSignature
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      receipt
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.verified).toBe(true);
    expect(result.receiptVerified).toBe(true);
    expect(result.quantumResistant).toBe(false); // Because pqSignature on proof is missing
  });

  it('should fail if PQ receipt signature is invalid', async () => {
    const pqSignature: PqSignature = {
      algorithm: 'Falcon-1024',
      data: 'INVALID_SIG',
      publicKey: 'valid-pubkey'
    };

    const receipt: PqReceipt = {
      version: '2030.1',
      timestamp: Date.now(),
      claimId: 'claim-123',
      zkProofHash: 'hash-123',
      pqSignature
    };

    const proof: PqZkProof = {
      claimId: 'claim-123',
      proofData: 'mock-proof-data',
      publicSignals: ['18'],
      receipt
    };

    const result = await engine.verify(mockClaim, proof);
    expect(result.receiptVerified).toBe(false);
  });
});
