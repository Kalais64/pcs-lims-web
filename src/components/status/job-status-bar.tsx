"use client";

import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";
import type { Job } from "@/lib/domain/types";
import {
  JOB_STEPPER,
  jobActionsFor,
  jobStepperIndex,
  type JobActionKey,
  type JobGatedAction,
} from "@/lib/status/job-gate";
import { JOB_STATUS_LABELS } from "@/lib/status/job";
import { cn } from "@/lib/utils";

export function JobStatusBar({
  job,
  user,
  busy,
  onAction,
}: {
  job: Job;
  user: SessionUser | null;
  busy?: boolean;
  onAction: (action: JobGatedAction) => void;
}) {
  const actions = jobActionsFor(job, user);
  const active = jobStepperIndex(job.status);

  return (
    <div className="space-y-3 rounded-xl border border-[#d5e4da] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[#14532D]">Status job</span>
        <StatusBadge entity="job" status={job.status} />
        {job.status === "cancelled" || job.status === "closed" ? (
          <span className="text-xs text-[#5d7266]">Jalur utama berhenti di sini (soft cancel / tutup).</span>
        ) : null}
      </div>
      <ol className="flex flex-wrap gap-1">
        {JOB_STEPPER.map((step, index) => (
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
            {index + 1}. {JOB_STATUS_LABELS[step]}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2" data-legal-actions={actions.map((a) => a.key).join(",")}>
        {actions.length === 0 ? (
          <p className="text-xs text-[#5d7266]">Tidak ada aksi yang diizinkan untuk peran dan status ini.</p>
        ) : (
          actions.map((action) => (
            <div key={action.key} className="max-w-[240px]">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                variant={action.key === "cancel" ? "destructive" : "outline"}
                className={
                  action.key !== "cancel"
                    ? "border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#14532D]"
                    : undefined
                }
                title={action.reason ?? undefined}
                onClick={() => onAction(action)}
              >
                {action.label}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type { JobActionKey, JobGatedAction };
