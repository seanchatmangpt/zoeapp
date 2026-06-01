import { AmbientBackscatterAdapter, compressLZW, decompressLZW } from '../AmbientBackscatterAdapter';
import { ThermalSyncEngine, claimDelta } from '../ThermalSyncEngine';

describe('Zero-Energy Sync Framework', () => {
  describe('AmbientBackscatterAdapter', () => {
    it('initializes with default config', () => {
      const adapter = new AmbientBackscatterAdapter();
      expect(adapter).toBeDefined();
    });

    it('buffers crdt deltas', () => {
      const adapter = new AmbientBackscatterAdapter();
      adapter.bufferDelta('userA_update_1');
      expect(() => adapter.bufferDelta('')).toThrow('Invalid delta');
    });

    it('encodes buffered deltas', () => {
      const adapter = new AmbientBackscatterAdapter({ reflectionCoefficient: 0.5 });
      adapter.bufferDelta('short');
      adapter.bufferDelta('a'.repeat(150));
      const encoded = adapter.encodeBuffer();
      
      expect(encoded).toHaveLength(2);
      expect(encoded[0].modulation).toBe('OOK');
      expect(encoded[1].modulation).toBe('FSK');
      expect(encoded[0].payload).toBe(Buffer.from('short').toString('base64'));
      expect(encoded[0].energyCostMicroJoules).toBe(5 * 0.05 * 2);
    });

    it('transmits encoded deltas successfully if SNR is good', async () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 10, reflectionCoefficient: 1 });
      adapter.bufferDelta('test_data');
      const result = await adapter.transmit(15);
      expect(result).toBe(true);
    });

    it('returns true immediately if there is nothing to transmit but SNR is ok', async () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 10, reflectionCoefficient: 1 });
      const result = await adapter.transmit(15);
      expect(result).toBe(true);
    });

    it('fails to transmit if SNR is poor', async () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 20, reflectionCoefficient: 0.5 });
      adapter.bufferDelta('test_data');
      const result = await adapter.transmit(30);
      expect(result).toBe(false);
    });

    it('throws error if already transmitting', async () => {
      const adapter = new AmbientBackscatterAdapter();
      adapter.bufferDelta('test_data');
      const p1 = adapter.transmit(50);
      await expect(adapter.transmit(50)).rejects.toThrow('Already transmitting');
      await p1;
    });

    it('receives and decodes valid payloads', () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 10, reflectionCoefficient: 1 });
      const encoded = { payload: Buffer.from('hello').toString('base64'), modulation: 'OOK' as const, energyCostMicroJoules: 1 };
      
      const received = adapter.receive(encoded, 50);
      expect(received).toBe('hello');
    });

    it('fails to receive if ambient noise is too high', () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 60, reflectionCoefficient: 1 });
      const encoded = { payload: Buffer.from('hello').toString('base64'), modulation: 'OOK' as const, energyCostMicroJoules: 1 };
      
      const received = adapter.receive(encoded, 50);
      expect(received).toBeNull();
    });

    it('fails gracefully on invalid payload type', () => {
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 10, reflectionCoefficient: 1 });
      const encoded = { payload: 123 as any, modulation: 'OOK' as const, energyCostMicroJoules: 1 };
      const received = adapter.receive(encoded, 0);
      expect(received).toBeNull();
    });

    it('compresses and decompresses correctly using LZW', () => {
      const testString = 'crdt-sync-message-crdt-sync-message-with-unicode-⚡';
      const compressed = compressLZW(testString);
      const decompressed = decompressLZW(compressed);
      expect(decompressed).toBe(testString);
    });
  });

  describe('ThermalSyncEngine', () => {
    it('initializes and harvests energy', () => {
      const engine = new ThermalSyncEngine(0.05);
      const harvested = engine.harvestEnergy({ deviceTempCelsius: 40, ambientTempCelsius: 20 }, 10);
      expect(harvested).toBe(200000);
      expect(engine.getEnergyBuffer()).toBe(200000);
    });

    it('checks transmission capability', () => {
      const engine = new ThermalSyncEngine(0.01);
      engine.harvestEnergy({ deviceTempCelsius: 30, ambientTempCelsius: 20 }, 1);
      expect(engine.canTransmit(500)).toBe(true);
      expect(engine.canTransmit(2000)).toBe(false);
    });

    it('consumes energy successfully', () => {
      const engine = new ThermalSyncEngine(0.01);
      engine.harvestEnergy({ deviceTempCelsius: 30, ambientTempCelsius: 20 }, 1);
      engine.consumeEnergy(500);
      expect(engine.getEnergyBuffer()).toBe(500);
    });

    it('throws if consuming more than available', () => {
      const engine = new ThermalSyncEngine(0.01);
      engine.harvestEnergy({ deviceTempCelsius: 25, ambientTempCelsius: 20 }, 1);
      expect(() => engine.consumeEnergy(500)).toThrow('Insufficient thermal energy harvested');
    });

    it('modulates and demodulates heat pulses', () => {
      const engine = new ThermalSyncEngine();
      const message = "CRDT_SYNC_PACKET";
      const pulses = engine.modulateDeltaWithHeat(message);
      expect(pulses).toHaveLength(message.length);
      
      const demodulated = engine.demodulateHeatPulses(pulses);
      expect(demodulated).toBe(message);
    });

    it('harvests kinetic and RF thermal noise energy', () => {
      const engine = new ThermalSyncEngine(0.02, 0.5, 0.1);
      // Harvest kinetic vibration
      const harvestedKinetic = engine.harvestEnergy({
        deviceTempCelsius: 20,
        ambientTempCelsius: 20,
        kineticVibrationHz: 50,
        kineticAmplitudeG: 2
      }, 2);
      // Kinetic power = 0.5 * 50 * 2^2 * 1000 = 100,000 microWatts
      // Harvested = 100,000 * 2 = 200,000 microJoules
      expect(harvestedKinetic).toBe(200000);

      // Harvest RF thermal noise
      // -10 dBm = 0.1 mW. RF power = 0.1 * 1000 * 0.1 = 10 microWatts
      // Harvested = 10 * 5 = 50 microJoules
      const harvestedRF = engine.harvestEnergy({
        deviceTempCelsius: 20,
        ambientTempCelsius: 20,
        rfAmbientPowerDbm: -10
      }, 5);
      expect(harvestedRF).toBe(50);
    });

    it('dynamically scales sync frequency based on harvested power', () => {
      const engine = new ThermalSyncEngine(0.02, 0.1, 0.05);
      
      // Zero energy/power -> Deep Sleep (0 Hz)
      expect(engine.getSyncFrequencyHz()).toBe(0);
      expect(engine.getEngineMode()).toBe('DEEP_SLEEP');

      // Low power -> scales down
      engine.harvestEnergy({
        deviceTempCelsius: 20,
        ambientTempCelsius: 20,
        kineticVibrationHz: 10,
        kineticAmplitudeG: 0.1
      }, 1);
      // Kinetic power = 0.1 * 10 * 0.01 * 1000 = 10 microWatts
      expect(engine.getSyncFrequencyHz()).toBeCloseTo(0.1); // 10 / 100
      expect(engine.getEngineMode()).toBe('LOW_ENERGY_COMPRESSED');

      // High power -> caps at 1 Hz
      engine.harvestEnergy({
        deviceTempCelsius: 20,
        ambientTempCelsius: 20,
        kineticVibrationHz: 200,
        kineticAmplitudeG: 1.0
      }, 1);
      // Kinetic power = 0.1 * 200 * 1 * 1000 = 20,000 microWatts
      expect(engine.getSyncFrequencyHz()).toBe(1.0);
      expect(engine.getEngineMode()).toBe('HIGH_ENERGY');
    });

    it('handles low energy harvest throttling by compression', async () => {
      const engine = new ThermalSyncEngine(0.02, 0.1, 0.05);
      const adapter = new AmbientBackscatterAdapter({ snrThreshold: 5, reflectionCoefficient: 1 });

      // Bring engine to LOW_ENERGY_COMPRESSED mode
      engine.harvestEnergy({
        deviceTempCelsius: 20,
        ambientTempCelsius: 20,
        kineticVibrationHz: 10,
        kineticAmplitudeG: 0.1
      }, 10); // power = 10 uW, harvested = 100 uJ, mode is LOW_ENERGY_COMPRESSED

      expect(engine.getEngineMode()).toBe('LOW_ENERGY_COMPRESSED');

      adapter.bufferDelta('delta_part_1');
      adapter.bufferDelta('delta_part_2');

      const encoded = adapter.encodeBuffer(engine.getEngineMode());
      expect(encoded).toHaveLength(1);
      expect(encoded[0].compressed).toBe(true);
      expect(encoded[0].modulation).toBe('FSK');

      // Transmit the compressed packet
      const result = await adapter.transmit(10, engine);
      expect(result).toBe(true);

      // Decompress and verify content
      const received = adapter.receive(encoded[0], 0);
      expect(received).toBe('delta_part_1|delta_part_2');
    });

    it('prevents state leaks and transitions in deep sleep', async () => {
      const engine = new ThermalSyncEngine();
      const adapter = new AmbientBackscatterAdapter();

      expect(engine.getEngineMode()).toBe('DEEP_SLEEP');

      // Attempt to witness transition in deep sleep
      const claimed = claimDelta('secret_crdt_delta');
      expect(() => engine.witnessDeltaTransition(claimed)).toThrow('State transition blocked: Engine is in DEEP_SLEEP');

      // Attempt to transmit in deep sleep
      adapter.bufferDelta('secret_crdt_delta');
      await expect(adapter.transmit(20, engine)).rejects.toThrow('Cannot transmit in DEEP_SLEEP');
    });

    it('enforces typestate transition laws and proxy integrity', () => {
      const engine = new ThermalSyncEngine();
      expect(engine.getEngineMode()).toBe('DEEP_SLEEP');

      // Try setting an illegal mode directly if we could, but Proxy blocks invalid transitions
      const stateProxy = (engine as any).state;
      expect(() => {
        stateProxy.mode = 'INVALID_MODE';
      }).toThrow('Illegal mode transition');
    });

    it('creates cryptographic receipts in verified transitions', () => {
      const engine = new ThermalSyncEngine();
      engine.harvestEnergy({ deviceTempCelsius: 35, ambientTempCelsius: 20 }, 10); // mode is HIGH_ENERGY
      
      const claimed = claimDelta('state_change_delta');
      const witnessed = engine.witnessDeltaTransition(claimed);
      
      expect(witnessed.__brand).toBe('Witnessed');
      expect(witnessed.value).toBe('state_change_delta');
      expect(witnessed.receipt).toBeDefined();
      expect(witnessed.receipt.algorithm).toBe('BLAKE3');
      expect(witnessed.receipt.stateHash).toBeTruthy();
      expect(witnessed.receipt.witnessed).toBe(true);
    });
  });
});
