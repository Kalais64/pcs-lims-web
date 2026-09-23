"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getRuntimeMode } from "@/lib/config/runtime";
import { sessionFromUser } from "@/lib/auth/profile";
import {
  clearSessionCookie,
  findDemoUser,
  userForRole,
  writeSessionCookie,
} from "@/lib/auth/session";
import type { Role, SessionUser } from "@/lib/auth/types";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type AuthContextValue = {
  user: SessionUser | null;
  isReady: boolean;
  mode: ReturnType<typeof getRuntimeMode>;
  profileError: string | null;
  login: (
    email: string,
    password: string,
    role: Role,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  loginAsRole: (role: Role) => void;
  switchRole: (role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_PREVIEW_USER: SessionUser = {
  id: "preview-empty",
  name: "Pratinjau (tanpa Supabase)",
  email: "preview@local",
  role: "admin",
};

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const mode = getRuntimeMode();
  const [user, setUser] = useState<SessionUser | null>(
    initialUser ?? (mode === "empty" ? EMPTY_PREVIEW_USER : null),
  );
  const [isReady, setIsReady] = useState(mode !== "live");
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "live") return;
    const client = createBrowserSupabase();
    if (!client) {
      setIsReady(true);
      return;
    }
    let cancelled = false;
    const sync = async () => {
      const { data } = await client.auth.getUser();
      if (!data.user) {
        if (!cancelled) {
          setUser(null);
          setProfileError(null);
          setIsReady(true);
        }
        return;
      }
      const session = await sessionFromUser(client, data.user);
      if (!cancelled) {
        setUser(session);
        setProfileError(
          session
            ? null
            : "Akun Auth ada, tetapi baris profiles untuk auth.uid() tidak ditemukan. Backend perlu seed profil.",
        );
        setIsReady(true);
      }
    };
    void sync();
    const { data: sub } = client.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  const login = useCallback(
    async (email: string, password: string, role: Role) => {
      if (mode === "fixtures") {
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
      }
      if (mode === "empty") {
        setUser(EMPTY_PREVIEW_USER);
        router.replace("/dashboard");
        return { ok: true as const };
      }
      const client = createBrowserSupabase();
      if (!client) {
        return { ok: false as const, message: "Supabase belum dikonfigurasi." };
      }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return {
          ok: false as const,
          message: error?.message ?? "Gagal masuk. Periksa email dan kata sandi Auth.",
        };
      }
      const session = await sessionFromUser(client, data.user);
      if (!session) {
        await client.auth.signOut();
        return {
          ok: false as const,
          message:
            "Masuk Auth berhasil, tetapi profiles.role untuk auth.uid() belum ada. Hubungi Backend untuk seed user.",
        };
      }
      setUser(session);
      setProfileError(null);
      router.replace("/dashboard");
      router.refresh();
      return { ok: true as const };
    },
    [mode, router],
  );

  const loginAsRole = useCallback(
    (role: Role) => {
      if (mode !== "fixtures") return;
      const match = userForRole(role);
      writeSessionCookie(match);
      setUser(match);
      router.replace("/dashboard");
      router.refresh();
    },
    [mode, router],
  );

  const switchRole = useCallback(
    (role: Role) => {
      if (mode !== "fixtures") return;
      const match = userForRole(role);
      writeSessionCookie(match);
      setUser(match);
      router.refresh();
    },
    [mode, router],
  );

  const logout = useCallback(() => {
    if (mode === "live") {
      const client = createBrowserSupabase();
      void client?.auth.signOut();
    } else {
      clearSessionCookie();
    }
    setUser(mode === "empty" ? EMPTY_PREVIEW_USER : null);
    router.replace("/login");
    router.refresh();
  }, [mode, router]);

  const value = useMemo(
    () => ({
      user,
      isReady,
      mode,
      profileError,
      login,
      loginAsRole,
      switchRole,
      logout,
    }),
    [user, isReady, mode, profileError, login, loginAsRole, switchRole, logout],
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
