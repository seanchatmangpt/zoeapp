import { IntelligenceRunner } from '../runner';
import { IntelligenceRegistry } from '../registry';
import { db } from '../../../db/db';
import fs from 'fs';
import path from 'path';

// Mock DB and schema
jest.mock('../../../db/db', () => ({
  db: {
    insert: jest.fn()
  }
}));

jest.mock('../../../db/schema', () => ({
  actorReceipts: {}
}));

// Mock FS and Path
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn()
}));

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('IntelligenceRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('run()', () => {
    it('throws if capability is not registered', async () => {
      await expect(IntelligenceRunner.run('invalid-id', {})).rejects.toThrow(
        "Process capability 'invalid-id' is not registered."
      );
    });

    it('throws if required input property is missing or null', async () => {
      IntelligenceRegistry.set('test-cap-missing-input', {
        id: 'test-cap-missing-input',
        name: 'Test',
        inputContract: {
          properties: {
            reqField: { type: 'string', required: true, description: '' }
          }
        },
        outputContract: { properties: {} },
        run: jest.fn()
      } as any);

      await expect(IntelligenceRunner.run('test-cap-missing-input', {})).rejects.toThrow(
        "InputContract Error: Missing required property 'reqField' for capability 'test-cap-missing-input'"
      );
      
      await expect(IntelligenceRunner.run('test-cap-missing-input', { reqField: null })).rejects.toThrow(
        "InputContract Error: Missing required property 'reqField' for capability 'test-cap-missing-input'"
      );
    });

    it('runs successfully, saves receipt, and handles DB insert', async () => {
      const mockRun = jest.fn().mockResolvedValue({
        success: true,
        result: { some: 'data' },
        logs: ['Log 1']
      });

      IntelligenceRegistry.set('test-cap-success', {
        id: 'test-cap-success',
        name: 'Test Success',
        inputContract: {
          properties: {
            optField: { type: 'string', required: false, description: '' }
          }
        },
        outputContract: { properties: {} },
        run: mockRun
      } as any);

      const dbInsertValuesMock = jest.fn();
      (db.insert as jest.Mock).mockReturnValue({ values: dbInsertValuesMock });

      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(false); // Should trigger mkdirSync
      (path.join as jest.Mock).mockImplementation((d, f) => `${d}/${f}`);

      const receipt = await IntelligenceRunner.run('test-cap-success', { optField: '123' });

      expect(receipt.success).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/fake/replays', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(dbInsertValuesMock).toHaveBeenCalled();
    });

    it('runs successfully when result is undefined and catches DB error', async () => {
      const mockRun = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed logic',
        logs: []
      });

      IntelligenceRegistry.set('test-cap-db-err', {
        id: 'test-cap-db-err',
        name: 'Test DB Err',
        inputContract: { properties: {} },
        outputContract: { properties: {} },
        run: mockRun
      } as any);

      const dbInsertValuesMock = jest.fn().mockRejectedValue(new Error('DB connection lost'));
      (db.insert as jest.Mock).mockReturnValue({ values: dbInsertValuesMock });

      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(true); // Should NOT trigger mkdirSync

      const receipt = await IntelligenceRunner.run('test-cap-db-err', {});

      expect(receipt.success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log intelligence receipt in SQLite database:',
        expect.any(Error)
      );
    });

    it('catches file system write error', async () => {
      const mockRun = jest.fn().mockResolvedValue({
        success: true,
        result: {},
        logs: []
      });

      IntelligenceRegistry.set('test-cap-fs-err', {
        id: 'test-cap-fs-err',
        name: 'Test FS Err',
        inputContract: { properties: {} },
        outputContract: { properties: {} },
        run: mockRun
      } as any);

      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn() });
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Disk full');
      });

      const receipt = await IntelligenceRunner.run('test-cap-fs-err', {});

      expect(receipt.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write host replay artifact file:',
        expect.any(Error)
      );
    });
  });

  describe('getReplayArtifact()', () => {
    it('returns null if file does not exist', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays/rec_1.json');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = IntelligenceRunner.getReplayArtifact('rec_1');
      expect(result).toBeNull();
    });

    it('returns artifact if file exists', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays/rec_2.json');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ receiptId: 'rec_2' }));

      const result = IntelligenceRunner.getReplayArtifact('rec_2');
      expect(result).toEqual({ receiptId: 'rec_2' });
    });

    it('returns null if fs read throws', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays/rec_3.json');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = IntelligenceRunner.getReplayArtifact('rec_3');
      expect(result).toBeNull();
    });
  });

  describe('listReplays()', () => {
    it('returns empty array if replays dir does not exist', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = IntelligenceRunner.listReplays();
      expect(result).toEqual([]);
    });

    it('returns list of artifacts from fs directory', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['rec_a.json', 'rec_b.json', 'other.txt']);
      (path.join as jest.Mock).mockImplementation((d, f) => `${d}/${f}`);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify({ receiptId: 'rec_a' }))
        .mockReturnValueOnce(JSON.stringify({ receiptId: 'rec_b' }));

      const result = IntelligenceRunner.listReplays();
      expect(result).toEqual([{ receiptId: 'rec_a' }, { receiptId: 'rec_b' }]);
    });

    it('returns partial list or handles exception if readdir throws', () => {
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read dir error');
      });

      const result = IntelligenceRunner.listReplays();
      expect(result).toEqual([]);
    });

    it('skips adding to list if receiptId already exists (covers branch line 141)', () => {
      jest.spyOn(Array, 'from').mockReturnValueOnce([{ receiptId: 'duplicate_rec' }] as any);
      (path.resolve as jest.Mock).mockReturnValue('/fake/replays');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['duplicate_rec.json']);
      (path.join as jest.Mock).mockImplementation((d, f) => `${d}/${f}`);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ receiptId: 'duplicate_rec' }));

      const result = IntelligenceRunner.listReplays();
      expect(result).toEqual([{ receiptId: 'duplicate_rec' }]);
    });
  });
});

describe('IntelligenceRunner (Mobile environment)', () => {
  let MobileRunner: any;
  let Registry: any;

  beforeAll(() => {
    const originalNodeVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', { value: undefined, configurable: true });

    jest.isolateModules(() => {
      MobileRunner = require('../runner').IntelligenceRunner;
      Registry = require('../registry').IntelligenceRegistry;
    });

    Object.defineProperty(process.versions, 'node', { value: originalNodeVersion, configurable: true });
  });

  it('stores and retrieves receipts in memory store instead of fs', async () => {
    Registry.set('mobile-cap', {
      id: 'mobile-cap',
      name: 'Mobile',
      inputContract: { properties: {} },
      outputContract: { properties: {} },
      run: jest.fn().mockResolvedValue({ success: true, result: {} })
    });

    const dbInsertValuesMock = jest.fn();
    (db.insert as jest.Mock).mockReturnValue({ values: dbInsertValuesMock });

    const receipt = await MobileRunner.run('mobile-cap', {});

    const artifact = MobileRunner.getReplayArtifact(receipt.id);
    expect(artifact).toBeDefined();
    expect(artifact?.receiptId).toBe(receipt.id);

    const list = MobileRunner.listReplays();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((r: any) => r.receiptId === receipt.id)).toBe(true);

    expect(MobileRunner.getReplayArtifact('non-existent')).toBeNull();
  });

  it('covers Map.get returning undefined (branch line 113)', async () => {
    const receipt = await MobileRunner.run('mobile-cap', {});
    
    const originalGet = Map.prototype.get;
    jest.spyOn(Map.prototype, 'get').mockImplementation(function(this: any, key: any) {
      if (key === receipt.id) return undefined;
      return originalGet.call(this, key);
    });

    const artifact = MobileRunner.getReplayArtifact(receipt.id);
    expect(artifact).toBeNull();

    jest.restoreAllMocks();
  });
});
