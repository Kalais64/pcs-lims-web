/**
 * Quotation — deferred v1.1. Enum usulan agar FE tidak mengarang nilai liar.
 * Bukan happy path MVP; layar tetap placeholder.
 */

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draf",
  sent: "Terkirim",
  accepted: "Diterima",
  rejected: "Ditolak",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};
