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
