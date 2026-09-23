import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/status/invoice";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/status/job";
import { LHU_STATUS_LABELS, type LhuStatus } from "@/lib/status/lhu";
import { SAMPLE_STATUS_LABELS, type SampleStatus } from "@/lib/status/sample";
import { SAMPLING_STATUS_LABELS, type SamplingStatus } from "@/lib/status/sampling";
import { cn } from "@/lib/utils";

type StatusBadgeProps =
  | { entity: "job"; status: JobStatus; className?: string }
  | { entity: "sample"; status: SampleStatus; className?: string }
  | { entity: "lhu"; status: LhuStatus; className?: string }
  | { entity: "invoice"; status: InvoiceStatus; className?: string }
  | { entity: "sampling"; status: SamplingStatus; className?: string };

const TONE: Record<string, string> = {
  draft: "bg-[#eef3f6] text-[#4a6070]",
  scheduled: "bg-[#e7f5fb] text-[#0877a9]",
  sampling: "bg-[#e7f5fb] text-[#0877a9]",
  expected: "bg-[#eef3f6] text-[#4a6070]",
  received: "bg-[#e7f5fb] text-[#0877a9]",
  testing: "bg-[#e7f5fb] text-[#0877a9]",
  in_testing: "bg-[#e7f5fb] text-[#0877a9]",
  verification: "bg-[#fff4d6] text-[#8a6500]",
  pending_verify: "bg-[#fff4d6] text-[#8a6500]",
  approval: "bg-[#fff4d6] text-[#8a6500]",
  pending_approve: "bg-[#fff4d6] text-[#8a6500]",
  lhu_ready: "bg-[#e8f7ee] text-[#1a7a45]",
  lhu_issued: "bg-[#e8f7ee] text-[#1a7a45]",
  issued: "bg-[#e8f7ee] text-[#1a7a45]",
  approved: "bg-[#e8f7ee] text-[#1a7a45]",
  invoiced: "bg-[#f0e8fb] text-[#5b3d8f]",
  unpaid: "bg-[#fff4d6] text-[#8a6500]",
  paid: "bg-[#e8f7ee] text-[#1a7a45]",
  closed: "bg-[#eef3f6] text-[#4a6070]",
  done: "bg-[#e8f7ee] text-[#1a7a45]",
  cancelled: "bg-[#fde8e8] text-[#a12626]",
  rejected: "bg-[#fde8e8] text-[#a12626]",
  void: "bg-[#fde8e8] text-[#a12626]",
  archived: "bg-[#eef3f6] text-[#4a6070]",
  superseded: "bg-[#eef3f6] text-[#4a6070]",
};

function labelFor(props: StatusBadgeProps): string {
  switch (props.entity) {
    case "job":
      return JOB_STATUS_LABELS[props.status];
    case "sample":
      return SAMPLE_STATUS_LABELS[props.status];
    case "lhu":
      return LHU_STATUS_LABELS[props.status];
    case "invoice":
      return INVOICE_STATUS_LABELS[props.status];
    case "sampling":
      return SAMPLING_STATUS_LABELS[props.status];
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "rounded-full border-0 hover:bg-inherit",
        TONE[props.status] ?? "bg-[#e7f5fb] text-[#0877a9]",
        props.className,
      )}
    >
      {labelFor(props)}
    </Badge>
  );
}
