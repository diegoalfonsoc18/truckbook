import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ─── Variables de entorno (EAS Secrets en producción) ────────────────────────
const supabaseUrl: string =
  Constants.expoConfig?.extra?.supabaseUrl ??
  "https://erinesvycnvmqbsrawlk.supabase.co";

const supabaseAnonKey: string =
  Constants.expoConfig?.extra?.supabaseAnonKey ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaW5lc3Z5Y252bXFic3Jhd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNzY5NjgsImV4cCI6MjA5Mjc1Mjk2OH0.mPMGwgcrcAfepUFs19PD75XjkPDIKRqzYWXWcAsQ0nM";

// ─── Adaptador SecureStore (cifrado en el keychain del dispositivo) ───────────
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ─── Cliente Supabase ─────────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
