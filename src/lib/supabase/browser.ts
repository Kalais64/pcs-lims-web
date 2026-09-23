import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/config/runtime";

export function createBrowserSupabase() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseAnonKey();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
