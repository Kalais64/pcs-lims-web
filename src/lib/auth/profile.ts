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
  const candidates = ["profiles", "staff_profiles"];
  for (const table of candidates) {
    const { data, error } = await client.from(table).select("*").eq("id", user.id).maybeSingle();
    if (error) continue;
    if (!data) continue;
    const [profile] = mapProfiles([data]);
    if (!profile?.id) continue;
    return {
      id: profile.id,
      name: profile.name || user.email || "Pengguna",
      email: profile.email || user.email || "",
      role: isRole(profile.role) ? profile.role : "sales",
    };
  }
  return null;
}
