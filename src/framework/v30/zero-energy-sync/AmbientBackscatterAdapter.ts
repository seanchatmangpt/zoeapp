import { blake3 } from '../../../lib/crypto/receipts';
import { ThermalSyncEngine, EngineMode } from './ThermalSyncEngine';

export interface BackscatterConfig {
  baseFrequencyHz: number;
  reflectionCoefficient: number;
  snrThreshold: number;
}

export interface EncodedDelta {
  payload: string;
  modulation: 'OOK' | 'FSK';
  energyCostMicroJoules: number;
  compressed?: boolean;
}

interface AdapterState {
  buffer: string[];
  isTransmitting: boolean;
  lastStateHash: string;
}

// Byte-level LZW compression algorithm
export function compressLZW(uncompressed: string): string {
  const bytes = Array.from(Buffer.from(uncompressed, 'utf8'));
  const dictionary: { [key: string]: number } = {};
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i;
  }
  let w = "";
  const result: number[] = [];
  let dictSize = 256;
  for (let i = 0; i < bytes.length; i++) {
    const c = String.fromCharCode(bytes[i]);
    const wc = w + c;
    if (dictionary.hasOwnProperty(wc)) {
      w = wc;
    } else {
      result.push(dictionary[w]);
      dictionary[wc] = dictSize++;
      w = c;
    }
  }
  if (w !== "") {
    result.push(dictionary[w]);
  }
  return result.map(x => x.toString(36)).join('-');
}

// Byte-level LZW decompression algorithm
export function decompressLZW(compressed: string): string {
  if (!compressed) return "";
  const dictionary: { [key: number]: string } = {};
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i);
  }
  const data = compressed.split('-').map(x => parseInt(x, 36));
  let dictSize = 256;
  let w = dictionary[data[0]];
  if (w === undefined) {
    throw new Error("LZW decompression error: invalid initial code");
  }
  const resultBytes: number[] = [w.charCodeAt(0)];
  for (let i = 1; i < data.length; i++) {
    const k = data[i];
    let entry = "";
    if (dictionary.hasOwnProperty(k)) {
      entry = dictionary[k];
    } else if (k === dictSize) {
      entry = w + w.charAt(0);
    } else {
      throw new Error("LZW decompression error");
    }
    for (let j = 0; j < entry.length; j++) {
      resultBytes.push(entry.charCodeAt(j));
    }
    dictionary[dictSize++] = w + entry.charAt(0);
    w = entry;
  }
  return Buffer.from(resultBytes).toString('utf8');
}

export class AmbientBackscatterAdapter {
  private config: BackscatterConfig;
  private state: AdapterState;

  get buffer(): string[] {
    return this.state.buffer;
  }
  set buffer(val: string[]) {
    this.state.buffer = val;
  }

  get isTransmitting(): boolean {
    return this.state.isTransmitting;
  }
  set isTransmitting(val: boolean) {
    this.state.isTransmitting = val;
  }

  constructor(config: Partial<BackscatterConfig> = {}) {
    this.config = {
      baseFrequencyHz: config.baseFrequencyHz ?? 2.4e9,
      reflectionCoefficient: config.reflectionCoefficient ?? 0.8,
      snrThreshold: config.snrThreshold ?? 15.0,
    };

    const rawState: AdapterState = {
      buffer: [],
      isTransmitting: false,
      lastStateHash: blake3(JSON.stringify({ buffer: [], isTransmitting: false }))
    };

    this.state = new Proxy(rawState, {
      set: (target, prop, value, receiver) => {
        const success = Reflect.set(target, prop, value, receiver);
        if (success) {
          const serialized = JSON.stringify({
            buffer: target.buffer,
            isTransmitting: target.isTransmitting
          });
          target.lastStateHash = blake3(serialized);
        }
        return success;
      }
    });
  }

  public bufferDelta(crdtDelta: string | { value: string }): void {
    const val = typeof crdtDelta === 'string' ? crdtDelta : crdtDelta.value;
    if (!val) throw new Error('Invalid delta');
    this.state.buffer = [...this.state.buffer, val];
  }

  public encodeBuffer(engineMode?: EngineMode): EncodedDelta[] {
    const encoded: EncodedDelta[] = [];
    
    if (engineMode === 'DEEP_SLEEP') {
      this.state.buffer = [];
      return [];
    }

    if (engineMode === 'LOW_ENERGY_COMPRESSED' && this.state.buffer.length > 0) {
      const bundled = this.state.buffer.join('|');
      const compressed = compressLZW(bundled);
      const energyCost = compressed.length * 0.02 * (1 / this.config.reflectionCoefficient);
      encoded.push({
        payload: Buffer.from(compressed).toString('base64'),
        modulation: 'FSK',
        energyCostMicroJoules: energyCost,
        compressed: true
      });
    } else {
      for (const delta of this.state.buffer) {
        const payloadLength = delta.length;
        const energyCost = payloadLength * 0.05 * (1 / this.config.reflectionCoefficient);
        encoded.push({
          payload: Buffer.from(delta).toString('base64'),
          modulation: payloadLength > 100 ? 'FSK' : 'OOK',
          energyCostMicroJoules: energyCost,
          compressed: false
        });
      }
    }
    this.state.buffer = [];
    return encoded;
  }

  public async transmit(ambientSignalStrength: number, syncEngine?: ThermalSyncEngine): Promise<boolean> {
    if (this.state.isTransmitting) {
      throw new Error('Already transmitting');
    }

    if (syncEngine && syncEngine.getEngineMode() === 'DEEP_SLEEP') {
      throw new Error('Cannot transmit in DEEP_SLEEP: zero energy harvested');
    }

    this.state.isTransmitting = true;

    try {
      const snr = ambientSignalStrength * this.config.reflectionCoefficient;
      if (snr < this.config.snrThreshold) {
        return false;
      }

      const mode = syncEngine ? syncEngine.getEngineMode() : undefined;
      const encoded = this.encodeBuffer(mode);
      if (encoded.length === 0) return true;

      if (syncEngine) {
        const totalCost = encoded.reduce((acc, pkg) => acc + pkg.energyCostMicroJoules, 0);
        if (!syncEngine.canTransmit(totalCost)) {
          // Put back the original deltas to avoid state loss
          const originalDeltas: string[] = [];
          for (const pkg of encoded) {
            const decoded = Buffer.from(pkg.payload, 'base64').toString('utf8');
            if (pkg.compressed) {
              originalDeltas.push(...decompressLZW(decoded).split('|'));
            } else {
              originalDeltas.push(decoded);
            }
          }
          this.state.buffer = [...originalDeltas, ...this.state.buffer];
          return false;
        }
        syncEngine.consumeEnergy(totalCost);
      }

      await new Promise(resolve => setTimeout(resolve, encoded.length * 5));

      return true;
    } finally {
      this.state.isTransmitting = false;
    }
  }

  public receive(encodedDelta: EncodedDelta, ambientNoise: number): string | null {
    const effectiveSnr = (100 - ambientNoise) * this.config.reflectionCoefficient;
    if (effectiveSnr < this.config.snrThreshold) {
      return null;
    }
    if (typeof encodedDelta.payload !== 'string') {
      return null;
    }
    const decoded = Buffer.from(encodedDelta.payload, 'base64').toString('utf8');
    if (encodedDelta.compressed) {
      try {
        return decompressLZW(decoded);
      } catch (e) {
        return null;
      }
    }
    return decoded;
  }
}
