import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ROLES, type Role, type SessionUser } from "@/lib/auth/types";
import { mapProfiles } from "@/lib/data/mappers";

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export async function sessionFromUser(
  client: SupabaseClient,
  user: User,
): Promise<SessionUser | null> {
  const { data, error } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error || !data) return null;
  const [profile] = mapProfiles([data]);
  if (!profile?.id) return null;
  return {
    id: profile.id,
    name: profile.name || user.email || "Pengguna",
    email: profile.email || user.email || "",
    role: isRole(profile.role) ? profile.role : "sales",
  };
}
