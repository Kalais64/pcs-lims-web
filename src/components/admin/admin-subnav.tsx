"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Master data" },
  { href: "/admin/audit", label: "Jejak audit" },
];

export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              active
                ? "border-[#16A34A] bg-[#16A34A] text-white"
                : "border-[#d5e4da] bg-white text-[#14532D] hover:bg-[#e7f4ec]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
