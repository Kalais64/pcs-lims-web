"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { canAccessPath } from "@/lib/auth/nav";
import { ROLE_LABELS, ROLES } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PcsIcon, PcsWordmark } from "@/components/brand/pcs-mark";
import { DataBanner } from "@/components/layout/data-banner";
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar-nav";

function SidebarBody({
  user,
  onLogout,
  onNavigate,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <SidebarBrand />
      <SidebarNav user={user} onNavigate={onNavigate} />
      <Button
        type="button"
        variant="ghost"
        className="mt-4 justify-start text-white/85 hover:bg-white/16 hover:text-white"
        onClick={onLogout}
      >
        Keluar
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, switchRole, mode } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f6faf7] text-[#12281c] lg:grid lg:grid-cols-[235px_1fr]">
      <aside className="hidden bg-[linear-gradient(180deg,#14532D,#16A34A)] px-4 py-[22px] text-white lg:block">
        <SidebarBody user={user} onLogout={logout} />
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-[#d5e4da] bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <PcsIcon size={32} />
            <PcsWordmark height={28} className="max-h-7 max-w-[180px]" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Buka menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="w-[260px] border-0 bg-[linear-gradient(180deg,#14532D,#16A34A)] p-4 text-white [&>button]:text-white"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu PCS LIMS</SheetTitle>
            </SheetHeader>
            <SidebarBody user={user} onLogout={logout} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:p-[26px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <PcsWordmark height={40} className="hidden max-h-10 lg:block" />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <div className="rounded-[10px] border border-[#d5e4da] bg-white px-3.5 py-2 text-sm text-[#12281c]">
                {user.name} · {ROLE_LABELS[user.role]}
              </div>
              {mode === "fixtures" ? (
                <Select
                  value={user.role}
                  onValueChange={(role) => {
                    switchRole(role as typeof user.role);
                    if (!canAccessPath(role as typeof user.role, pathname)) {
                      router.replace("/dashboard");
                    }
                  }}
                >
                  <SelectTrigger className="w-[170px] bg-white" aria-label="Ganti peran demo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-[10px] border border-[#d5e4da] bg-[#e7f4ec] px-3.5 py-2 text-xs text-[#14532D]">
                  Peran dari profiles · auth.uid()
                </div>
              )}
            </div>
          </div>
          <DataBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
