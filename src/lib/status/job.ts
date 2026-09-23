/** Job status — MVP LOCKED 2026-09-23 */

export const JOB_STATUSES = [
  "draft",
  "scheduled",
  "sampling",
  "received",
  "testing",
  "verification",
  "approval",
  "lhu_ready",
  "lhu_issued",
  "invoiced",
  "closed",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draf",
  scheduled: "Terjadwal",
  sampling: "Sampling",
  received: "Diterima",
  testing: "Pengujian",
  verification: "Verifikasi",
  approval: "Approval",
  lhu_ready: "Siap LHU",
  lhu_issued: "LHU terbit",
  invoiced: "Sudah ditagih",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
};

const JOB_STATUS_ALIASES: Record<string, JobStatus> = {
  draft: "draft",
  scheduled: "scheduled",
  sampling: "sampling",
  in_progress: "sampling",
  received: "received",
  testing: "testing",
  verification: "verification",
  pending_verification: "verification",
  approval: "approval",
  pending_approval: "approval",
  lhu_ready: "lhu_ready",
  ready_for_lhu: "lhu_ready",
  lhu_issued: "lhu_issued",
  invoiced: "invoiced",
  closed: "closed",
  cancelled: "cancelled",
  canceled: "cancelled",
};

export function normalizeJobStatus(value: string, fallback: JobStatus = "draft"): JobStatus {
  return JOB_STATUS_ALIASES[value] ?? fallback;
}
