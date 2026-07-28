import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has no web implementation (its web module is a stub with
 * no exported functions), so calling it directly on web throws synchronously
 * and leaves callers' promises rejected forever. This wraps it with a
 * localStorage-backed fallback so web (used for local dev via `expo start
 * --web`) behaves the same as native instead of hanging on startup.
 */
export const secureStorage = {
  getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};
