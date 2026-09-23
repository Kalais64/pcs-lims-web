export type RuntimeMode = "live" | "fixtures" | "empty";

export function publicSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function publicSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function hasPublicSupabaseEnv() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseAnonKey();
  return Boolean(url && key && url.startsWith("http"));
}

export function useFixturesFlag() {
  return process.env.NEXT_PUBLIC_USE_FIXTURES === "true";
}

export function getRuntimeMode(): RuntimeMode {
  if (useFixturesFlag()) return "fixtures";
  if (hasPublicSupabaseEnv()) return "live";
  return "empty";
}
