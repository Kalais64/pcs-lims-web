/** LHU status — MVP LOCKED 2026-09-23 */

export const LHU_STATUSES = ["draft", "issued", "superseded"] as const;

export type LhuStatus = (typeof LHU_STATUSES)[number];

export const LHU_STATUS_LABELS: Record<LhuStatus, string> = {
  draft: "Draf",
  issued: "Diterbitkan",
  superseded: "Digantikan",
};
