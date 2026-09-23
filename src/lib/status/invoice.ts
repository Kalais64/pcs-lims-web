/** Invoice stub status — MVP LOCKED 2026-09-23 */

export const INVOICE_STATUSES = ["unpaid", "paid", "void"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Belum lunas",
  paid: "Lunas",
  void: "Dibatalkan",
};

const INVOICE_STATUS_ALIASES: Record<string, InvoiceStatus> = {
  unpaid: "unpaid",
  draft: "unpaid",
  paid: "paid",
  void: "void",
};

export function normalizeInvoiceStatus(
  value: string,
  fallback: InvoiceStatus = "unpaid",
): InvoiceStatus {
  return INVOICE_STATUS_ALIASES[value] ?? fallback;
}
