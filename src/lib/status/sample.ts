/** Sample status — MVP LOCKED 2026-09-23 */

export const SAMPLE_STATUSES = [
  "expected",
  "received",
  "in_testing",
  "pending_verify",
  "pending_approve",
  "approved",
  "rejected",
  "archived",
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  expected: "Diharapkan",
  received: "Diterima",
  in_testing: "Pengujian",
  pending_verify: "Menunggu verifikasi",
  pending_approve: "Menunggu approval",
  approved: "Disetujui",
  rejected: "Ditolak",
  archived: "Diarsipkan",
};

/** Backend / PRD-01 draft aliases → MVP LOCKED enum. */
const SAMPLE_STATUS_ALIASES: Record<string, SampleStatus> = {
  expected: "expected",
  registered: "expected",
  received: "received",
  in_testing: "in_testing",
  testing: "in_testing",
  pending_verify: "pending_verify",
  pending_verification: "pending_verify",
  pending_approve: "pending_approve",
  pending_approval: "pending_approve",
  verified: "pending_approve",
  approved: "approved",
  rejected: "rejected",
  archived: "archived",
  cancelled: "archived",
  canceled: "archived",
};

export function normalizeSampleStatus(value: string, fallback: SampleStatus = "expected"): SampleStatus {
  return SAMPLE_STATUS_ALIASES[value] ?? fallback;
}
