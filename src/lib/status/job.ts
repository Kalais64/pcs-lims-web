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
