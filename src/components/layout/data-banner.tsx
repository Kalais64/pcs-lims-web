"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useLims } from "@/lib/store/lims-provider";

export function DataBanner() {
  const { mode, profileError } = useAuth();
  const { loadError, isLoading } = useLims();
  if (mode === "fixtures") return null;
  const text =
    profileError ||
    loadError ||
    (mode === "empty"
      ? "Mode kosong: set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY, atau NEXT_PUBLIC_USE_FIXTURES=true untuk demo lokal."
      : isLoading
        ? "Memuat data Supabase…"
        : null);
  if (!text) return null;
  return (
    <div className="mb-4 rounded-[10px] border border-[#c4ddce] bg-[#e7f4ec] px-3.5 py-2 text-sm text-[#146338]">
      {text}
    </div>
  );
}
