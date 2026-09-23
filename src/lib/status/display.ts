import type { JobStatus } from "@/lib/status/job";
import { JOB_STATUS_LABELS } from "@/lib/status/job";
import type { SampleStatus } from "@/lib/status/sample";
import { SAMPLE_STATUS_LABELS } from "@/lib/status/sample";

/** Label mockup lama — helper saja, enum kanonik = LOCKED. */
export function mockupPhaseFromJob(status: JobStatus): string {
  return JOB_STATUS_LABELS[status];
}

export function mockupPhaseFromSample(status: SampleStatus): string {
  return SAMPLE_STATUS_LABELS[status];
}
