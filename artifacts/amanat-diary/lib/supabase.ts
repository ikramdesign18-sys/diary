import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PLACEHOLDER_MARKERS = ["replace", "placeholder", "your_", "your-", "example"];

const isPlaceholder = (value?: string) => {
  const normalized = value?.trim().toLowerCase();
  return !normalized || PLACEHOLDER_MARKERS.some(marker => normalized.includes(marker));
};

const isSupabaseUrl = (value?: string) => {
  if (isPlaceholder(value)) return false;
  try {
    const url = new URL(value!);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
};

const isSupabaseAnonKey = (value?: string) => {
  if (isPlaceholder(value)) return false;
  const key = value!.trim();
  return key.startsWith("sb_publishable_") || (key.startsWith("eyJ") && key.split(".").length === 3);
};

export const supabaseConfigured = isSupabaseUrl(supabaseUrl) && isSupabaseAnonKey(supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
