import { PolymorphicEngine } from '../PolymorphicEngine';

describe('PolymorphicEngine', () => {
    let engine: PolymorphicEngine;

    beforeEach(() => {
        engine = new PolymorphicEngine();
    });

    it('should encrypt and decrypt correctly', () => {
        const plaintext = 'Super secret quantum data';
        const ciphertext = engine.encrypt(plaintext);
        expect(ciphertext).toBeDefined();
        expect(ciphertext).not.toEqual(plaintext);
        expect(ciphertext.startsWith('v1:')).toBe(true);

        const decrypted = engine.decrypt(ciphertext);
        expect(decrypted).toEqual(plaintext);
    });

    it('should correctly handle rotation', () => {
        const plaintext1 = 'Message 1';
        const ciphertext1 = engine.encrypt(plaintext1);
        
        const oldId = engine.getCurrentContextId();
        
        engine.rotate();
        const newId = engine.getCurrentContextId();
        expect(oldId).not.toEqual(newId);

        const plaintext2 = 'Message 2';
        const ciphertext2 = engine.encrypt(plaintext2);

        expect(engine.decrypt(ciphertext1)).toEqual(plaintext1);
        expect(engine.decrypt(ciphertext2)).toEqual(plaintext2);
    });

    it('should generate and validate DNA Sequence Keys', () => {
        const key = engine.generateDNASequenceKey(256);
        expect(key).toBeDefined();
        expect(key.sequence.length).toEqual(256);
        expect(key.entropyScore).toBeGreaterThan(0);
        
        const isValid = engine.validateDNASequenceKey(key);
        expect(isValid).toBe(true);

        const defaultKey = engine.generateDNASequenceKey();
        expect(defaultKey.sequence.length).toEqual(256);
    });

    it('should reject invalid DNA Sequence Keys', () => {
        expect(engine.validateDNASequenceKey(null as any)).toBe(false);
        expect(engine.validateDNASequenceKey({} as any)).toBe(false);

        const invalidBaseKey = {
            sequence: 'INVALID_BASES',
            entropyScore: 2.0,
            generatedAt: Date.now()
        };
        expect(engine.validateDNASequenceKey(invalidBaseKey)).toBe(false);

        const expiredKey = {
            sequence: 'ACGTACGT',
            entropyScore: 2.0,
            generatedAt: Date.now() - 4000 * 1000 // > 1 hour ago
        };
        expect(engine.validateDNASequenceKey(expiredKey)).toBe(false);
        
        const lowEntropyKey = {
            sequence: 'AAAAAAAA',
            entropyScore: 0.0,
            generatedAt: Date.now()
        };
        expect(engine.validateDNASequenceKey(lowEntropyKey)).toBe(false);
    });

    it('should regenerate DNA key on rotate if present', () => {
        engine.generateDNASequenceKey(128);
        const originalSequence = engine.getActiveDNAKey()?.sequence;
        
        engine.rotate();
        
        const newSequence = engine.getActiveDNAKey()?.sequence;
        expect(newSequence).toBeDefined();
        expect(newSequence).not.toEqual(originalSequence);
    });

    it('should throw on invalid payload format', () => {
        expect(() => engine.decrypt('invalid_payload')).toThrow('Invalid polymorphic payload format');
        expect(() => engine.decrypt('v2:id:alg:iv:auth:cipher')).toThrow('Unsupported payload version: v2');
    });

    it('should throw on missing key', () => {
        expect(() => engine.decrypt('v1:unknown_id:aes-256-gcm:iv:auth:cipher')).toThrow('Key not found in temporal store');
    });

    it('should throw on algorithm mismatch', () => {
        const ciphertext = engine.encrypt('test');
        const parts = ciphertext.split(':');
        const wrongAlg = parts[2] === 'aes-256-gcm' ? 'aes-256-cbc' : 'aes-256-gcm';
        parts[2] = wrongAlg;
        const tampered = parts.join(':');
        expect(() => engine.decrypt(tampered)).toThrow('Algorithm mismatch in payload');
    });

    it('should rotate continuously to cover all algorithms and decrypt successfully', () => {
        const algorithmsSeen = new Set<string>();
        for (let i = 0; i < 50; i++) {
            engine.rotate();
            const pt = 'test_payload_' + i;
            const ct = engine.encrypt(pt);
            
            const decrypted = engine.decrypt(ct);
            expect(decrypted).toEqual(pt);
            
            const alg = ct.split(':')[2];
            algorithmsSeen.add(alg);
        }
        expect(algorithmsSeen.size).toBe(2);
        expect(algorithmsSeen.has('aes-256-gcm')).toBe(true);
        expect(algorithmsSeen.has('aes-256-cbc')).toBe(true);
    });

    it('should handle getActiveDNAKey when no key has been generated', () => {
        expect(engine.getActiveDNAKey()).toBeNull();
    });

    it('should test lattice key variance', () => {
        // Verify key generation entropy and parameter variance for post-quantum lattice scheme.
        const keyPair1 = engine.generateLatticeKeyPair(8, 257);
        const keyPair2 = engine.generateLatticeKeyPair(8, 257);

        // Check structure
        expect(keyPair1.publicKey.A.length).toBe(8);
        expect(keyPair1.publicKey.t.length).toBe(8);
        expect(keyPair1.privateKey.s.length).toBe(8);

        // Check that successive generations produce different keys (variance across keys)
        expect(keyPair1.publicKey.t).not.toEqual(keyPair2.publicKey.t);

        // Calculate and check internal variance of the elements
        const variance1 = engine.calculateLatticeVariance(keyPair1);
        expect(variance1.A).toBeGreaterThan(0);
        expect(variance1.t).toBeGreaterThan(0);
        expect(variance1.s).toBeGreaterThan(0);
        
        const variance2 = engine.calculateLatticeVariance(keyPair2);
        expect(variance2.A).toBeGreaterThan(0);
        expect(variance2.t).toBeGreaterThan(0);
        expect(variance2.s).toBeGreaterThan(0);
    });

    it('should verify and handle successful and failed Falcon-1024/Dilithium-5 frame signatures', () => {
        const payload = 'sync-frame-data-123';
        const publicKey = Buffer.from('mock-falcon-pubkey').toString('base64');
        
        // Generate valid signature
        const validSig = engine.generateSimulatedSignature(payload, 'Falcon-1024', publicKey);
        
        const frame = {
            id: 'frame-1',
            payload,
            signature: {
                algorithm: 'Falcon-1024' as const,
                data: validSig,
                publicKey
            },
            timestamp: Date.now()
        };

        // Verification should succeed
        const verified = engine.verifyNetworkSyncFrame(frame);
        expect(verified).toBe(true);
        expect(engine.isQuarantined()).toBe(false);

        // Now, verify with an invalid signature (e.g. tampered data)
        const tamperedFrame = {
            id: 'frame-2',
            payload,
            signature: {
                algorithm: 'Falcon-1024' as const,
                data: 'INVALID_SIGNATURE_DATA',
                publicKey
            },
            timestamp: Date.now()
        };

        const otherEngine = new PolymorphicEngine();
        const verifiedTampered = otherEngine.verifyNetworkSyncFrame(tamperedFrame);
        expect(verifiedTampered).toBe(false);
        expect(otherEngine.isQuarantined()).toBe(true);
    });

    it('should trigger frame quarantine path and block all subsequent operations', () => {
        const payload = 'quarantine-sync-payload';
        const publicKey = Buffer.from('mock-dilithium-pubkey').toString('base64');

        const badFrame = {
            id: 'bad-frame-3',
            payload,
            signature: {
                algorithm: 'Dilithium-5' as const,
                data: 'BAD_SIGNATURE',
                publicKey
            },
            timestamp: Date.now()
        };

        expect(engine.isQuarantined()).toBe(false);

        // Failed verification triggers quarantine
        const verified = engine.verifyNetworkSyncFrame(badFrame);
        expect(verified).toBe(false);
        expect(engine.isQuarantined()).toBe(true);

        // Quarantined records must store the frame and reason
        const quarantinedRecords = engine.getQuarantinedFrames();
        expect(quarantinedRecords.length).toBe(1);
        expect(quarantinedRecords[0].frame.id).toBe('bad-frame-3');
        expect(quarantinedRecords[0].reason).toContain('Cryptographic signature mismatch');

        // Subsequent operations must throw error
        expect(() => engine.encrypt('hello')).toThrow('Engine is quarantined');
        expect(() => engine.decrypt('v1:id:alg:iv:auth:cipher')).toThrow('Engine is quarantined');
        expect(() => engine.rotate()).toThrow('Engine is quarantined');
        expect(() => engine.verifyNetworkSyncFrame(badFrame)).toThrow('Engine is quarantined');

        // Verify we can clear quarantine
        engine.clearQuarantine();
        expect(engine.isQuarantined()).toBe(false);
        expect(engine.getQuarantinedFrames().length).toBe(0);

        // Operations should work again
        const pt = 'recovered payload';
        const ct = engine.encrypt(pt);
        expect(engine.decrypt(ct)).toBe(pt);
    });

    it('should test Truex envelope generation on state mutations', () => {
        const initialEnvelope = engine.getTruexEnvelope();
        expect(initialEnvelope).toBeDefined();

        engine.rotate();
        const postRotateEnvelope = engine.getTruexEnvelope();
        expect(postRotateEnvelope).not.toEqual(initialEnvelope);

        engine.generateDNASequenceKey(128);
        const postDnaEnvelope = engine.getTruexEnvelope();
        expect(postDnaEnvelope).not.toEqual(postRotateEnvelope);
    });
});
