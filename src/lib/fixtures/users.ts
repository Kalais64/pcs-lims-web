import type { Role, SessionUser } from "@/lib/auth/types";

export type DemoUser = SessionUser & { password: string };

export const DEMO_PASSWORD = "pcs-demo";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "usr-admin",
    name: "Etik Wijaya",
    email: "etik@pcs-lab.id",
    role: "admin",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-sales",
    name: "Rina Sales",
    email: "rina@pcs-lab.id",
    role: "sales",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-sampler",
    name: "Andri Sampler",
    email: "andri@pcs-lab.id",
    role: "sampler",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-analyst",
    name: "Dewi Analyst",
    email: "dewi@pcs-lab.id",
    role: "analyst",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-verifier",
    name: "Budi Verifier",
    email: "budi@pcs-lab.id",
    role: "verifier",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-approver",
    name: "Sari Approver",
    email: "sari@pcs-lab.id",
    role: "approver",
    password: DEMO_PASSWORD,
  },
  {
    id: "usr-finance",
    name: "Hendra Finance",
    email: "hendra@pcs-lab.id",
    role: "finance",
    password: DEMO_PASSWORD,
  },
];

export const DEMO_ROLE_OPTIONS: { role: Role; email: string }[] = DEMO_USERS.map(
  (user) => ({ role: user.role, email: user.email }),
);
