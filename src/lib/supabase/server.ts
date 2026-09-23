import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/config/runtime";
import { guardSupabase } from "@/lib/supabase/guard";

export async function createServerSupabase() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseAnonKey();
  if (!url || !key) return null;
  const jar = await cookies();
  return guardSupabase(createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; middleware refresh handles that.
        }
      },
    },
  }));
}
