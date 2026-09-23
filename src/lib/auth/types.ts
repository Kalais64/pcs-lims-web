export const ROLES = [
  "admin",
  "sales",
  "sampler",
  "analyst",
  "verifier",
  "approver",
  "finance",
] as const;

export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  sales: "Sales / CS",
  sampler: "Sampler",
  analyst: "Analyst",
  verifier: "Verifier",
  approver: "Approver",
  finance: "Finance",
};

export const SESSION_COOKIE = "pcs-lims-session";
