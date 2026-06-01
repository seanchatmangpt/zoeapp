import { blake3 } from '../../../lib/crypto/receipts';

export interface ThermalState {
  deviceTempCelsius: number;
  ambientTempCelsius: number;
  kineticVibrationHz?: number;
  kineticAmplitudeG?: number;
  rfAmbientPowerDbm?: number;
}

export type EngineMode = 'HIGH_ENERGY' | 'LOW_ENERGY_COMPRESSED' | 'DEEP_SLEEP';

export interface BackscatterReceipt {
  readonly receiptId: string;
  readonly timestamp: string;
  readonly stateHash: string;
  readonly energyBufferRemaining: number;
  readonly mode: EngineMode;
  readonly algorithm: 'BLAKE3';
  readonly witnessed: boolean;
}

export type Claimed<T> = {
  readonly __brand: 'Claimed';
  readonly value: T;
};

export type Witnessed<T> = {
  readonly __brand: 'Witnessed';
  readonly value: T;
  readonly receipt: BackscatterReceipt;
};

export function claimDelta(delta: string): Claimed<string> {
  return {
    __brand: 'Claimed',
    value: delta,
  };
}

export interface EngineState {
  energyBufferMicroJoules: number;
  lastHarvestedPowerMicroWatts: number;
  mode: EngineMode;
  lastStateHash: string;
}

export class ThermalSyncEngine {
  private baseConversionEfficiency: number;
  private baseKineticEfficiency: number;
  private baseRfEfficiency: number;
  private readonly minimumEnergyRequired: number = 50.0;
  private state: EngineState;

  get energyBufferMicroJoules(): number {
    return this.state.energyBufferMicroJoules;
  }
  set energyBufferMicroJoules(val: number) {
    this.state.energyBufferMicroJoules = val;
  }

  constructor(
    baseConversionEfficiency: number = 0.02,
    baseKineticEfficiency: number = 0.1,
    baseRfEfficiency: number = 0.05
  ) {
    this.baseConversionEfficiency = baseConversionEfficiency;
    this.baseKineticEfficiency = baseKineticEfficiency;
    this.baseRfEfficiency = baseRfEfficiency;

    const rawState: EngineState = {
      energyBufferMicroJoules: 0,
      lastHarvestedPowerMicroWatts: 0,
      mode: 'DEEP_SLEEP',
      lastStateHash: blake3(JSON.stringify({ energyBufferMicroJoules: 0, lastHarvestedPowerMicroWatts: 0, mode: 'DEEP_SLEEP' }))
    };

    this.state = new Proxy(rawState, {
      set: (target, prop, value, receiver) => {
        const oldVal = Reflect.get(target, prop, receiver);
        if (oldVal === value) return true;

        if (prop === 'mode') {
          const validTransitions: Record<string, string[]> = {
            'DEEP_SLEEP': ['LOW_ENERGY_COMPRESSED', 'HIGH_ENERGY', 'DEEP_SLEEP'],
            'LOW_ENERGY_COMPRESSED': ['DEEP_SLEEP', 'HIGH_ENERGY', 'LOW_ENERGY_COMPRESSED'],
            'HIGH_ENERGY': ['DEEP_SLEEP', 'LOW_ENERGY_COMPRESSED', 'HIGH_ENERGY']
          };
          if (!validTransitions[target.mode].includes(value)) {
            throw new Error(`Illegal mode transition: ${target.mode} -> ${value}`);
          }
        }

        const success = Reflect.set(target, prop, value, receiver);
        if (success) {
          const serialized = JSON.stringify({
            energyBufferMicroJoules: target.energyBufferMicroJoules,
            lastHarvestedPowerMicroWatts: target.lastHarvestedPowerMicroWatts,
            mode: target.mode
          });
          target.lastStateHash = blake3(serialized);
        }
        return success;
      }
    });
  }

  public harvestEnergy(state: ThermalState, durationSeconds: number): number {
    // 1. Thermoelectric generator
    const deltaT = Math.abs(state.deviceTempCelsius - state.ambientTempCelsius);
    const thermoelectricPower = this.baseConversionEfficiency * Math.pow(deltaT, 2) * 1000;

    // 2. Kinetic vibration generator
    const vibrationHz = state.kineticVibrationHz ?? 0;
    const amplitudeG = state.kineticAmplitudeG ?? 0;
    const kineticPower = this.baseKineticEfficiency * vibrationHz * Math.pow(amplitudeG, 2) * 1000;

    // 3. RF thermal noise generator
    const rfPowerMicroWatts = state.rfAmbientPowerDbm !== undefined
      ? Math.pow(10, state.rfAmbientPowerDbm / 10) * 1000 * this.baseRfEfficiency
      : 0;

    const powerMicroWatts = thermoelectricPower + kineticPower + rfPowerMicroWatts;
    const harvested = powerMicroWatts * durationSeconds;

    this.state.energyBufferMicroJoules += harvested;
    this.state.lastHarvestedPowerMicroWatts = powerMicroWatts;

    this.updateEngineMode(powerMicroWatts);

    return harvested;
  }

  public getEnergyBuffer(): number {
    return this.state.energyBufferMicroJoules;
  }

  public getEngineMode(): EngineMode {
    return this.state.mode;
  }

  public getSyncFrequencyHz(): number {
    const power = this.state.lastHarvestedPowerMicroWatts;
    if (power === 0 && this.state.energyBufferMicroJoules === 0) {
      return 0; // Deep sleep
    }
    if (power === 0) {
      return this.state.energyBufferMicroJoules > 0 ? 0.01 : 0;
    }
    return Math.min(1.0, Math.max(0.01, power / 100));
  }

  public canTransmit(energyRequired: number): boolean {
    return this.state.energyBufferMicroJoules >= (this.minimumEnergyRequired + energyRequired);
  }

  public consumeEnergy(amount: number): void {
    if (!this.canTransmit(amount)) {
      throw new Error('Insufficient thermal energy harvested');
    }
    this.state.energyBufferMicroJoules -= amount;
    this.updateEngineMode(this.state.lastHarvestedPowerMicroWatts);
  }

  private updateEngineMode(power: number): void {
    const energy = this.state.energyBufferMicroJoules;
    if (power === 0 && energy === 0) {
      this.state.mode = 'DEEP_SLEEP';
    } else if (power < 50 || energy < 100) {
      this.state.mode = 'LOW_ENERGY_COMPRESSED';
    } else {
      this.state.mode = 'HIGH_ENERGY';
    }
  }

  public witnessDeltaTransition(claimed: Claimed<string>): Witnessed<string> {
    if (this.state.mode === 'DEEP_SLEEP') {
      throw new Error('State transition blocked: Engine is in DEEP_SLEEP, ensuring zero state leak');
    }

    const timestamp = new Date().toISOString();
    const stateHash = blake3(claimed.value);
    const receipt: BackscatterReceipt = {
      receiptId: `rec_sync_${Math.random().toString(36).substring(2, 11)}`,
      timestamp,
      stateHash,
      energyBufferRemaining: this.state.energyBufferMicroJoules,
      mode: this.state.mode,
      algorithm: 'BLAKE3',
      witnessed: true,
    };

    return {
      __brand: 'Witnessed',
      value: claimed.value,
      receipt,
    };
  }

  public witnessBundleTransition(claimedList: Claimed<string>[], compressFunction: (uncompressed: string) => string): Witnessed<string> {
    if (this.state.mode === 'DEEP_SLEEP') {
      throw new Error('State transition blocked: Engine is in DEEP_SLEEP, ensuring zero state leak');
    }

    const combinedValue = claimedList.map(c => c.value).join('|');
    const processedValue = this.state.mode === 'LOW_ENERGY_COMPRESSED'
      ? compressFunction(combinedValue)
      : combinedValue;

    const timestamp = new Date().toISOString();
    const stateHash = blake3(processedValue);
    const receipt: BackscatterReceipt = {
      receiptId: `rec_sync_${Math.random().toString(36).substring(2, 11)}`,
      timestamp,
      stateHash,
      energyBufferRemaining: this.state.energyBufferMicroJoules,
      mode: this.state.mode,
      algorithm: 'BLAKE3',
      witnessed: true,
    };

    return {
      __brand: 'Witnessed',
      value: processedValue,
      receipt,
    };
  }

  public modulateDeltaWithHeat(delta: string): number[] {
    const pulses: number[] = [];
    for (let i = 0; i < delta.length; i++) {
      pulses.push(delta.charCodeAt(i) * 0.1);
    }
    return pulses;
  }

  public demodulateHeatPulses(pulses: number[]): string {
    let result = '';
    for (const pulse of pulses) {
      const charCode = Math.round(pulse / 0.1);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}
