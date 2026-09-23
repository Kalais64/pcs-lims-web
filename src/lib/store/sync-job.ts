import type { JobStatus } from "@/lib/status/job";
import type { LimsData, Sample } from "@/lib/domain/types";

const ACTIVE: Sample["status"][] = [
  "expected",
  "received",
  "in_testing",
  "pending_verify",
  "pending_approve",
  "approved",
  "rejected",
];

export function deriveJobStatus(data: LimsData, jobId: string): JobStatus {
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job || job.status === "cancelled" || job.status === "closed" || job.status === "invoiced") {
    return job?.status ?? "draft";
  }
  if (job.status === "draft" || job.status === "scheduled") return job.status;
  if (data.invoices.some((inv) => inv.jobId === jobId && inv.status !== "void")) return "invoiced";
  if (data.lhuRecords.some((l) => l.jobId === jobId && l.status === "issued")) return "lhu_issued";

  const samples = data.samples.filter((s) => s.jobId === jobId && ACTIVE.includes(s.status));
  if (samples.length === 0) {
    if (data.samplingEvents.some((e) => e.jobId === jobId && e.status === "scheduled")) return "sampling";
    if (job.status === "lhu_ready") return "lhu_ready";
    return job.status;
  }
  if (samples.every((s) => s.status === "approved")) return "lhu_ready";
  if (samples.some((s) => s.status === "pending_approve")) return "approval";
  if (samples.some((s) => s.status === "pending_verify")) return "verification";
  if (samples.some((s) => s.status === "in_testing" || s.status === "rejected")) return "testing";
  if (samples.some((s) => s.status === "received")) return "received";
  if (samples.some((s) => s.status === "expected")) return "sampling";
  return job.status;
}

export function withSyncedJob(data: LimsData, jobId: string): LimsData {
  const next = deriveJobStatus(data, jobId);
  return {
    ...data,
    jobs: data.jobs.map((j) => (j.id === jobId ? { ...j, status: next } : j)),
  };
}
