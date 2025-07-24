import "react-native-url-polyfill/auto";
import * as SecureStore from 'expo-secure-store';
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line import/no-unresolved
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";

// Custom secure storage adapter
const secureStorage = {
  async getItem(key: string) {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY
  || "", {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});