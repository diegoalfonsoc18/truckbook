import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
// Adaptador con chunking: la sesión de Supabase supera los 2048 bytes que
// tolera SecureStore, y una escritura fallida deslogueaba al usuario al
// reabrir la app. Ver src/config/secureStoreChunked.ts.
import { SecureStoreAdapter } from "./secureStoreChunked";

// ─── Variables de entorno (EAS Secrets en producción) ────────────────────────
const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? "";
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? "";

// ─── Cliente Supabase ─────────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

export default supabase;
