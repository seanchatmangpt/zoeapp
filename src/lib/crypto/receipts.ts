/**
 * Pure JavaScript UTF-8 encoder helper to byte array.
 * Works consistently across all JS runtimes (Node, Hermes, browsers).
 */
function stringToUtf8ByteArray(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      // Surrogate pair
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

/**
 * Pure JavaScript implementation of SHA-256 standard hash function.
 * Avoids any platform-specific dependencies and works in React Native/Expo as well as Node.js.
 */
export function sha256(message: string): string {
  const bytes = stringToUtf8ByteArray(message);
  const bitLength = bytes.length * 8;

  // Pad the bytes block
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  // Append the 64-bit length (big-endian)
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength & 0xffffffff;

  bytes.push(
    (highBits >> 24) & 0xff,
    (highBits >> 16) & 0xff,
    (highBits >> 8) & 0xff,
    highBits & 0xff,
    (lowBits >> 24) & 0xff,
    (lowBits >> 16) & 0xff,
    (lowBits >> 8) & 0xff,
    lowBits & 0xff
  );

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] =
        (bytes[i + t * 4] << 24) |
        (bytes[i + t * 4 + 1] << 16) |
        (bytes[i + t * 4 + 2] << 8) |
        bytes[i + t * 4 + 3];
    }

    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  return H.map((val) => {
    const unsignedVal = val < 0 ? val + 0x100000000 : val;
    return unsignedVal.toString(16).padStart(8, '0');
  }).join('');
}

/**
 * Deterministic JSON stringifier to ensure canonical format of any object.
 * This is crucial so that same properties key-ordering yields the same hash.
 */
export function canonicalStringify(val: any): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(val[k])}`);
  return '{' + parts.join(',') + '}';
}

/**
 * Computes a receipt hash-chaining output.
 *
 * @param previousHash The SHA-256 hash of the previous receipt in the chain. Use null or empty string for the genesis block.
 * @param data The feature-agnostic receipt payload.
 * @returns The SHA-256 hash representing this receipt chained to the previous block.
 */
export function generateReceiptHash(previousHash: string | null | undefined, data: any): string {
  const prev = previousHash || '';
  const dataStr = canonicalStringify(data);
  return sha256(prev + dataStr);
}

const IV = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

const MSG_PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];

const CHUNK_START = 1 << 0;
const CHUNK_END = 1 << 1;
const PARENT = 1 << 2;
const ROOT = 1 << 3;

function blake3G(v: number[], a: number, b: number, c: number, d: number, x: number, y: number) {
  v[a] = (v[a] + v[b] + x) | 0;
  v[d] = rightRotate(v[d] ^ v[a], 16);
  v[c] = (v[c] + v[d]) | 0;
  v[b] = rightRotate(v[b] ^ v[c], 12);
  v[a] = (v[a] + v[b] + y) | 0;
  v[d] = rightRotate(v[d] ^ v[a], 8);
  v[c] = (v[c] + v[d]) | 0;
  v[b] = rightRotate(v[b] ^ v[c], 7);
}

function rightRotate(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function compressBlake3(
  chainingValue: number[],
  blockWords: number[],
  counterLow: number,
  counterHigh: number,
  blockLen: number,
  flags: number
): number[] {
  const v = [
    chainingValue[0], chainingValue[1], chainingValue[2], chainingValue[3],
    chainingValue[4], chainingValue[5], chainingValue[6], chainingValue[7],
    IV[0], IV[1], IV[2], IV[3],
    counterLow, counterHigh,
    blockLen, flags
  ];

  let m = [...blockWords];

  for (let round = 0; round < 7; round++) {
    if (round > 0) {
      const nextM = new Array(16);
      for (let i = 0; i < 16; i++) {
        nextM[i] = m[MSG_PERMUTATION[i]];
      }
      m = nextM;
    }
    // Column step
    blake3G(v, 0, 4, 8, 12, m[0], m[1]);
    blake3G(v, 1, 5, 9, 13, m[2], m[3]);
    blake3G(v, 2, 6, 10, 14, m[4], m[5]);
    blake3G(v, 3, 7, 11, 15, m[6], m[7]);
    // Diagonal step
    blake3G(v, 0, 5, 10, 15, m[8], m[9]);
    blake3G(v, 1, 6, 11, 12, m[10], m[11]);
    blake3G(v, 2, 7, 8, 13, m[12], m[13]);
    blake3G(v, 3, 4, 9, 14, m[14], m[15]);
  }

  return [
    v[0] ^ v[8],
    v[1] ^ v[9],
    v[2] ^ v[10],
    v[3] ^ v[11],
    v[4] ^ v[12],
    v[5] ^ v[13],
    v[6] ^ v[14],
    v[7] ^ v[15]
  ];
}

function bytesToWords(bytes: number[], start: number, end: number): number[] {
  const words = new Array(16).fill(0);
  for (let i = 0; i < 16; i++) {
    const offset = start + i * 4;
    let w = 0;
    if (offset < end) w |= bytes[offset];
    if (offset + 1 < end) w |= bytes[offset + 1] << 8;
    if (offset + 2 < end) w |= bytes[offset + 2] << 16;
    if (offset + 3 < end) w |= bytes[offset + 3] << 24;
    words[i] = w;
  }
  return words;
}

/**
 * Pure JavaScript implementation of the BLAKE3 cryptographic hash function.
 */
export function blake3(message: string): string {
  const bytes = stringToUtf8ByteArray(message);
  const chunkSize = 1024;
  const chunkOutputs: number[][] = [];
  
  let chunkIndex = 0;
  let start = 0;
  
  if (bytes.length === 0) {
    const words = new Array(16).fill(0);
    const hashWords = compressBlake3(IV, words, 0, 0, 0, CHUNK_START | CHUNK_END | ROOT);
    return hashWords.map(w => {
      const unsigned = w < 0 ? w + 0x100000000 : w;
      const b0 = unsigned & 0xff;
      const b1 = (unsigned >> 8) & 0xff;
      const b2 = (unsigned >> 16) & 0xff;
      const b3 = (unsigned >> 24) & 0xff;
      return [b0, b1, b2, b3].map(b => b.toString(16).padStart(2, '0')).join('');
    }).join('');
  }
  
  while (start < bytes.length) {
    const end = Math.min(start + chunkSize, bytes.length);
    const chunkBytes = bytes.slice(start, end);
    
    let cv = [...IV];
    const numBlocks = Math.ceil(chunkBytes.length / 64);
    
    for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
      const blockStart = blockIdx * 64;
      const blockEnd = Math.min(blockStart + 64, chunkBytes.length);
      const blockLen = blockEnd - blockStart;
      const words = bytesToWords(chunkBytes, blockStart, blockEnd);
      
      let flags = 0;
      if (blockIdx === 0) flags |= CHUNK_START;
      if (blockIdx === numBlocks - 1) flags |= CHUNK_END;
      
      if (end === bytes.length && blockIdx === numBlocks - 1) {
        flags |= ROOT;
      }
      
      const counterLow = chunkIndex & 0xffffffff;
      const counterHigh = Math.floor(chunkIndex / 0x100000000);
      
      cv = compressBlake3(cv, words, counterLow, counterHigh, blockLen, flags);
    }
    
    chunkOutputs.push(cv);
    chunkIndex++;
    start = end;
  }
  
  let currentLevel = chunkOutputs;
  while (currentLevel.length > 1) {
    const nextLevel: number[][] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        const parentWords = [...left, ...right];
        
        let flags = PARENT;
        if (i + 2 >= currentLevel.length && nextLevel.length === 0) {
          if (currentLevel.length === 2) {
            flags |= ROOT;
          }
        }
        
        const cv = compressBlake3(IV, parentWords, 0, 0, 64, flags);
        nextLevel.push(cv);
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    currentLevel = nextLevel;
  }
  
  const finalWords = currentLevel[0];
  return finalWords.map(w => {
    const unsigned = w < 0 ? w + 0x100000000 : w;
    const b0 = unsigned & 0xff;
    const b1 = (unsigned >> 8) & 0xff;
    const b2 = (unsigned >> 16) & 0xff;
    const b3 = (unsigned >> 24) & 0xff;
    return [b0, b1, b2, b3].map(b => b.toString(16).padStart(2, '0')).join('');
  }).join('');
}

export function generateBlake3ReceiptHash(previousHash: string | null | undefined, data: any): string {
  const prev = previousHash || '';
  const dataStr = canonicalStringify(data);
  return blake3(prev + dataStr);
}
