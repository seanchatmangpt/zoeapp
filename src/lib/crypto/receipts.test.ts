import { sha256, canonicalStringify, generateReceiptHash } from './receipts';

describe('Receipt Cryptographic Auditing', () => {
  describe('sha256', () => {
    it('computes correct SHA-256 for empty string', () => {
      expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('computes correct SHA-256 for standard string', () => {
      expect(sha256('hello world')).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('computes correct SHA-256 for unicode and emoji characters', () => {
      // "hello 🌟 world" UTF-8 bytes representation
      const hash1 = sha256('hello 🌟 world');
      const hash2 = sha256('hello 🌟 world');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('canonicalStringify', () => {
    it('serializes objects deterministically regardless of key order', () => {
      const obj1 = { a: 1, b: { y: 2, x: 1 }, c: [1, 2] };
      const obj2 = { c: [1, 2], b: { x: 1, y: 2 }, a: 1 };
      
      expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
      expect(canonicalStringify(obj1)).toBe('{"a":1,"b":{"x":1,"y":2},"c":[1,2]}');
    });

    it('handles primitive values correctly', () => {
      expect(canonicalStringify(null)).toBe('null');
      expect(canonicalStringify(undefined)).toBe('undefined');
      expect(canonicalStringify(123)).toBe('123');
      expect(canonicalStringify('test')).toBe('"test"');
      expect(canonicalStringify(true)).toBe('true');
    });
  });

  describe('generateReceiptHash', () => {
    it('generates genesis hash when previousHash is null or empty', () => {
      const data = { amount: 100, currency: 'USD' };
      const hashFromNull = generateReceiptHash(null, data);
      const hashFromEmpty = generateReceiptHash('', data);
      
      expect(hashFromNull).toBe(hashFromEmpty);
      expect(hashFromNull).toHaveLength(64);
    });

    it('chains receipts correctly by linking the previous hash', () => {
      const genesisData = { message: 'Genesis Block' };
      const genesisHash = generateReceiptHash(null, genesisData);

      const secondData = { amount: 50, recipient: 'Alice' };
      const secondHash = generateReceiptHash(genesisHash, secondData);

      expect(secondHash).not.toBe(genesisHash);
      expect(secondHash).toHaveLength(64);

      // Mutating genesis hash or data changes the subsequent hash
      const mutatedGenesisHash = generateReceiptHash(null, { message: 'Genesis Block Mutated' });
      const mutatedSecondHash = generateReceiptHash(mutatedGenesisHash, secondData);
      expect(mutatedSecondHash).not.toBe(secondHash);
    });
  });
});
