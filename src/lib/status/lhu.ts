/** LHU status — MVP LOCKED 2026-09-23 */

export const LHU_STATUSES = ["draft", "issued", "superseded"] as const;

export type LhuStatus = (typeof LHU_STATUSES)[number];

export const LHU_STATUS_LABELS: Record<LhuStatus, string> = {
  draft: "Draf",
  issued: "Diterbitkan",
  superseded: "Digantikan",
};

const LHU_STATUS_ALIASES: Record<string, LhuStatus> = {
  draft: "draft",
  issued: "issued",
  superseded: "superseded",
  void: "superseded",
};

export function normalizeLhuStatus(value: string, fallback: LhuStatus = "draft"): LhuStatus {
  return LHU_STATUS_ALIASES[value] ?? fallback;
}
