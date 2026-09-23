"use client";

import { getRuntimeMode } from "@/lib/config/runtime";
import { FixtureLimsProvider } from "@/lib/store/fixture-lims";
import { LiveLimsProvider } from "@/lib/store/live-lims";

export { useLims, staffName } from "@/lib/store/context";

export function LimsProvider({ children }: { children: React.ReactNode }) {
  const mode = getRuntimeMode();
  if (mode === "fixtures") {
    return <FixtureLimsProvider>{children}</FixtureLimsProvider>;
  }
  return <LiveLimsProvider mode={mode}>{children}</LiveLimsProvider>;
}
