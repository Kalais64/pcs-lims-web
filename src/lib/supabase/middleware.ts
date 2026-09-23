import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/config/runtime";
import { limsFetch } from "@/lib/supabase/lims-fetch";

export async function refreshSupabaseSession(request: NextRequest) {
  const url = publicSupabaseUrl();
  const key = publicSupabaseAnonKey();
  let response = NextResponse.next({ request });
  if (!url || !key) return { response, user: null };

  const supabase = createServerClient(url, key, {
    global: { fetch: limsFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user, supabase };
}
