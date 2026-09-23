import type { Role } from "@/lib/auth/types";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: readonly Role[];
};

const ALL_ROLES: readonly Role[] = [
  "admin",
  "sales",
  "sampler",
  "analyst",
  "verifier",
  "approver",
  "finance",
];

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "▦",
    roles: ALL_ROLES,
  },
  {
    href: "/customers",
    label: "Customer",
    icon: "◉",
    roles: ["admin", "sales"],
  },
  {
    href: "/quotations",
    label: "Quotation",
    icon: "▤",
    roles: ["admin", "sales"],
  },
  {
    href: "/jobs",
    label: "Job Order",
    icon: "▣",
    roles: ["admin", "sales", "finance"],
  },
  {
    href: "/sampling",
    label: "Sampling",
    icon: "⌖",
    roles: ["admin", "sampler"],
  },
  {
    href: "/samples",
    label: "Sample Tracking",
    icon: "⌁",
    roles: ["admin", "sampler", "analyst", "verifier", "approver"],
  },
  {
    href: "/testing",
    label: "Pengujian",
    icon: "⚗",
    roles: ["admin", "analyst"],
  },
  {
    href: "/approvals",
    label: "Verifikasi & Approval",
    icon: "✓",
    roles: ["admin", "verifier", "approver"],
  },
  {
    href: "/lhu",
    label: "LHU",
    icon: "▧",
    roles: ["admin", "verifier", "approver"],
  },
  {
    href: "/invoices",
    label: "Invoice & AR",
    icon: "Rp",
    roles: ["admin", "sales", "finance"],
  },
  {
    href: "/master",
    label: "Master Data",
    icon: "⚙",
    roles: ["admin"],
  },
];

const PATH_ALIASES: Record<string, string> = {
  "/customer": "/customers",
  "/customer/": "/customers",
  "/invoice": "/invoices",
  "/invoice/": "/invoices",
};

export function canAccessPath(role: Role, pathname: string): boolean {
  const resolved = PATH_ALIASES[pathname] ?? pathname;
  const item = NAV_ITEMS.find(
    (nav) => resolved === nav.href || resolved.startsWith(`${nav.href}/`),
  );
  if (!item) return true;
  return item.roles.includes(role);
}

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
