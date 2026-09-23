"use client";

import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";
import type { Sample } from "@/lib/domain/types";
import {
  SAMPLE_STEPPER,
  sampleActionsFor,
  stepperIndex,
  type SampleActionKey,
  type SampleGatedAction,
} from "@/lib/status/sample-gate";
import { SAMPLE_STATUS_LABELS } from "@/lib/status/sample";
import { cn } from "@/lib/utils";

export function SampleStatusBar({
  sample,
  user,
  busy,
  onAction,
}: {
  sample: Sample;
  user: SessionUser | null;
  busy?: boolean;
  onAction: (action: SampleGatedAction) => void;
}) {
  const actions = sampleActionsFor(sample, user);
  const active = stepperIndex(sample.status);

  return (
    <div className="space-y-3 rounded-xl border border-[#d5e4da] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[#14532D]">Status sampel</span>
        <StatusBadge entity="sample" status={sample.status} />
        {sample.status === "rejected" || sample.status === "archived" ? (
          <span className="text-xs text-[#5d7266]">Jalur utama berhenti di sini (soft cancel).</span>
        ) : null}
      </div>
      <ol className="flex flex-wrap gap-1">
        {SAMPLE_STEPPER.map((step, index) => (
          <li
            key={step}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px]",
              index === active
                ? "bg-[#16A34A] text-white"
                : index < active
                  ? "bg-[#e8f7ee] text-[#14532D]"
                  : "bg-[#eef4f0] text-[#5d7266]",
            )}
          >
            {index + 1}. {SAMPLE_STATUS_LABELS[step]}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {actions.length === 0 ? (
          <p className="text-xs text-[#5d7266]">Tidak ada aksi yang diizinkan untuk peran dan status ini.</p>
        ) : (
          actions.map((action) => (
            <div key={action.key} className="max-w-[220px]">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                variant={action.key === "reject" || action.key === "archive" ? "destructive" : "outline"}
                className={
                  action.key !== "reject" && action.key !== "archive"
                    ? "border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#14532D]"
                    : undefined
                }
                title={action.reason ?? undefined}
                onClick={() => onAction(action)}
              >
                {action.label}
              </Button>
              {action.override && action.reason ? (
                <p className="mt-1 text-[11px] leading-snug text-[#8a6500]">{action.reason}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type { SampleActionKey, SampleGatedAction };
