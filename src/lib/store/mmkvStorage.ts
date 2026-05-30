import { StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

// Initialize a dedicated MMKV instance for Zustand stores
export const mmkvInstance = createMMKV({
  id: 'zoeapp-zustand-storage',
});

/**
 * Persisted Zustand storage interface utilizing react-native-mmkv.
 * Fast, synchronous key-value storage adapter for local-first caches.
 */
export const mmkvStorage: StateStorage = {
  /**
   * Set a value in storage.
   */
  setItem: (name: string, value: string): void => {
    mmkvInstance.set(name, value);
  },

  /**
   * Retrieve a value from storage. Returns null if not found.
   */
  getItem: (name: string): string | null => {
    const value = mmkvInstance.getString(name);
    return value ?? null;
  },

  /**
   * Remove a value from storage.
   */
  removeItem: (name: string): void => {
    mmkvInstance.remove(name);
  },
};
