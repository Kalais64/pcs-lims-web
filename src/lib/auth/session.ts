import { SESSION_COOKIE, type Role, type SessionUser } from "@/lib/auth/types";
import { DEMO_USERS } from "@/lib/fixtures/users";

export function parseSessionCookie(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as SessionUser;
    if (!parsed?.id || !parsed.role || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeSession(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function writeSessionCookie(user: SessionUser) {
  document.cookie = `${SESSION_COOKIE}=${serializeSession(user)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
}

export function findDemoUser(email: string, password: string, role: Role): SessionUser | null {
  const match = DEMO_USERS.find(
    (user) =>
      user.email.toLowerCase() === email.trim().toLowerCase() &&
      user.password === password &&
      user.role === role,
  );
  if (!match) return null;
  const { password: _password, ...session } = match;
  return session;
}

export function userForRole(role: Role): SessionUser {
  const match = DEMO_USERS.find((user) => user.role === role);
  if (!match) {
    throw new Error(`Tidak ada pengguna demo untuk peran ${role}`);
  }
  const { password: _password, ...session } = match;
  return session;
}
