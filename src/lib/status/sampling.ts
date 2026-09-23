export const SAMPLING_STATUSES = ["scheduled", "done", "cancelled"] as const;

export type SamplingStatus = (typeof SAMPLING_STATUSES)[number];

export const SAMPLING_STATUS_LABELS: Record<SamplingStatus, string> = {
  scheduled: "Terjadwal",
  done: "Selesai",
  cancelled: "Dibatalkan",
};
