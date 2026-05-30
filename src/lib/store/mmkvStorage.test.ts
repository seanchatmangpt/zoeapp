import { mmkvStorage, mmkvInstance } from './mmkvStorage';

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  const mockInstance = {
    set: jest.fn(),
    getString: jest.fn(),
    remove: jest.fn(),
  };
  return {
    createMMKV: jest.fn(() => mockInstance),
  };
});

describe('mmkvStorage Zustand Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should set the stringified value in MMKV', () => {
      const name = 'app-state';
      const value = JSON.stringify({ count: 1 });

      mmkvStorage.setItem(name, value);

      expect(mmkvInstance.set).toHaveBeenCalledWith(name, value);
    });
  });

  describe('getItem', () => {
    it('should return value string if present', () => {
      const name = 'app-state';
      const storedValue = JSON.stringify({ count: 1 });
      (mmkvInstance.getString as jest.Mock).mockReturnValueOnce(storedValue);

      const result = mmkvStorage.getItem(name);

      expect(mmkvInstance.getString).toHaveBeenCalledWith(name);
      expect(result).toBe(storedValue);
    });

    it('should return null if value is not present', () => {
      const name = 'non-existent';
      (mmkvInstance.getString as jest.Mock).mockReturnValueOnce(undefined);

      const result = mmkvStorage.getItem(name);

      expect(mmkvInstance.getString).toHaveBeenCalledWith(name);
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove the key from MMKV', () => {
      const name = 'app-state';

      mmkvStorage.removeItem(name);

      expect(mmkvInstance.remove).toHaveBeenCalledWith(name);
    });
  });
});
