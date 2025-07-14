import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// URL de tu proyecto Supabase
const supabaseUrl = "https://zmvuiatgqinhqbajykfv.supabase.co";

// Puedes poner tu anon key aquí directamente si aún no usas dotenv
const supabaseAnonKey = process.env.SUPABASE_KEY || "TU_ANON_KEY_AQUÍ";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
