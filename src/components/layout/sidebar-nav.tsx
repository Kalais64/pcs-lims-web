"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PcsIcon } from "@/components/brand/pcs-mark";
import { navItemsForRole } from "@/lib/auth/nav";
import { ROLE_LABELS, type SessionUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

export function SidebarBrand() {
  return (
    <div className="mb-7 flex items-center gap-2.5">
      <PcsIcon size={52} />
      <div>
        <b className="block text-[19px] leading-none">PCS LIMS</b>
        <small className="mt-[3px] block text-xs text-white/75">Laboratorium Lingkungan</small>
      </div>
    </div>
  );
}

export function SidebarNav({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItemsForRole(user.role);

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-[9px] px-3.5 py-3 text-left text-sm text-[#e8f7ee] transition-colors",
              active || "hover:bg-white/16",
              active && "bg-white/16",
            )}
          >
            <span className="mr-2 opacity-90">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
      <p className="mt-auto pt-6 text-[11px] text-white/55">
        Masuk sebagai {ROLE_LABELS[user.role]}
      </p>
    </nav>
  );
}
