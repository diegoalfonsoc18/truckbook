import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// URL de tu proyecto Supabase
const supabaseUrl = "https://zmvuiatgqinhqbajykfv.supabase.co";

// Puedes poner tu anon key aquí directamente si aún no usas dotenv
const supabaseAnonKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdnVpYXRncWluaHFiYWp5a2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzM3MTAsImV4cCI6MjA2ODAwOTcxMH0.22lG8GJVfo7PK0nIYfpm99V9U7MVCmlQp2EGTryD_5E";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
