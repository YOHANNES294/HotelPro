import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryFallback = new Map<string, string>();

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryFallback.get(key) || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryFallback.get(key) || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        else memoryFallback.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        else memoryFallback.delete(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};
