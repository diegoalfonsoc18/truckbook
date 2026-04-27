import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://erinesvycnvmqbsrawlk.supabase.co";

const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaW5lc3Z5Y252bXFic3Jhd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNzY5NjgsImV4cCI6MjA5Mjc1Mjk2OH0.mPMGwgcrcAfepUFs19PD75XjkPDIKRqzYWXWcAsQ0nM";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
