import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/config/runtime";
import { guardSupabase } from "@/lib/supabase/guard";
import { limsFetch } from "@/lib/supabase/lims-fetch";

export function createBrowserSupabase() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseAnonKey();
  if (!url || !key) return null;
  return guardSupabase(createBrowserClient(url, key, { global: { fetch: limsFetch } }));
}
