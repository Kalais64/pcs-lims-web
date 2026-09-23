"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LimsProvider } from "@/lib/store/lims-provider";
import type { SessionUser } from "@/lib/auth/types";

export function AppProviders({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider initialUser={initialUser}>
      <LimsProvider>{children}</LimsProvider>
    </AuthProvider>
  );
}
