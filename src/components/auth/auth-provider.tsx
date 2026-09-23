"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearSessionCookie,
  findDemoUser,
  userForRole,
  writeSessionCookie,
} from "@/lib/auth/session";
import type { Role, SessionUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: SessionUser | null;
  isReady: boolean;
  login: (email: string, password: string, role: Role) => { ok: true } | { ok: false; message: string };
  loginAsRole: (role: Role) => void;
  switchRole: (role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  const login = useCallback(
    (email: string, password: string, role: Role) => {
      const match = findDemoUser(email, password, role);
      if (!match) {
        return {
          ok: false as const,
          message: "Email, kata sandi, atau peran tidak sesuai akun demo.",
        };
      }
      writeSessionCookie(match);
      setUser(match);
      router.replace("/dashboard");
      router.refresh();
      return { ok: true as const };
    },
    [router],
  );

  const loginAsRole = useCallback(
    (role: Role) => {
      const match = userForRole(role);
      writeSessionCookie(match);
      setUser(match);
      router.replace("/dashboard");
      router.refresh();
    },
    [router],
  );

  const switchRole = useCallback((role: Role) => {
    const match = userForRole(role);
    writeSessionCookie(match);
    setUser(match);
    router.refresh();
  }, [router]);

  const logout = useCallback(() => {
    clearSessionCookie();
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, isReady: true, login, loginAsRole, switchRole, logout }),
    [user, login, loginAsRole, switchRole, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return ctx;
}
