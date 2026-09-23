import type { Role, SessionUser } from "@/lib/auth/types";
import type { Job, LimsData } from "@/lib/domain/types";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/status/job";

export const JOB_FREE_EDIT_STATUSES: readonly JobStatus[] = ["draft", "scheduled"];

export const JOB_EARLY_CANCEL_STATUSES: readonly JobStatus[] = ["draft", "scheduled"];

export const JOB_ADMIN_CANCEL_STATUSES: readonly JobStatus[] = [
  "sampling",
  "received",
  "testing",
  "verification",
  "approval",
  "lhu_ready",
  "lhu_issued",
  "invoiced",
];

export const JOB_STEPPER: readonly JobStatus[] = [
  "draft",
  "scheduled",
  "sampling",
  "received",
  "testing",
  "verification",
  "approval",
  "lhu_ready",
  "lhu_issued",
  "invoiced",
  "closed",
];

export type JobActionKey = "edit" | "next" | "cancel";

export type JobGatedAction = {
  key: JobActionKey;
  label: string;
  allowed: boolean;
  reason: string | null;
  toStatus: JobStatus | null;
  override: boolean;
  reasonRequired: boolean;
};

const WRITE_ROLES: readonly Role[] = ["admin", "sales"];
const SAMPLING_START_ROLES: readonly Role[] = ["admin", "sales", "sampler"];

const NEXT_ROLES: Record<JobStatus, readonly Role[] | null> = {
  draft: WRITE_ROLES,
  scheduled: SAMPLING_START_ROLES,
  sampling: ["admin", "sampler", "analyst"],
  received: ["admin", "analyst"],
  testing: ["admin", "analyst"],
  verification: ["admin", "verifier"],
  approval: ["admin", "approver"],
  lhu_ready: ["admin", "approver"],
  lhu_issued: ["admin", "finance"],
  invoiced: ["admin", "finance"],
  closed: null,
  cancelled: null,
};

const NEXT_STATUS: Record<JobStatus, JobStatus | null> = {
  draft: "scheduled",
  scheduled: "sampling",
  sampling: "received",
  received: "testing",
  testing: "verification",
  verification: "approval",
  approval: "lhu_ready",
  lhu_ready: "lhu_issued",
  lhu_issued: "invoiced",
  invoiced: "closed",
  closed: null,
  cancelled: null,
};

const NEXT_LABEL: Record<JobStatus, string> = {
  draft: "Jadwalkan",
  scheduled: "Mulai sampling",
  sampling: "Tandai diterima",
  received: "Mulai pengujian",
  testing: "Kirim verifikasi",
  verification: "Lanjut approval",
  approval: "Siap LHU",
  lhu_ready: "Tandai LHU terbit",
  lhu_issued: "Tandai ditagih",
  invoiced: "Tutup job",
  closed: "Tutup",
  cancelled: "Batal",
};

function deny(reason: string): { allowed: false; reason: string } {
  return { allowed: false, reason };
}

function allow(): { allowed: true; reason: null } {
  return { allowed: true, reason: null };
}

export function jobStatusRank(status: JobStatus): number {
  return JOB_STEPPER.indexOf(status);
}

export function isSamplingOrLater(status: JobStatus): boolean {
  return jobStatusRank(status) >= jobStatusRank("sampling");
}

export function canFreeEditJob(status: JobStatus, role: Role | undefined): boolean {
  return Boolean(role && WRITE_ROLES.includes(role) && JOB_FREE_EDIT_STATUSES.includes(status));
}

export function canChangeJobCustomer(status: JobStatus, role: Role | undefined): boolean {
  return Boolean(role && WRITE_ROLES.includes(role) && status === "draft");
}

export function canEditJobSite(status: JobStatus, role: Role | undefined): boolean {
  return canFreeEditJob(status, role);
}

export function canEditJobDueOrScope(status: JobStatus, role: Role | undefined): boolean {
  if (canFreeEditJob(status, role)) return true;
  return Boolean(role === "admin" && isSamplingOrLater(status) && status !== "closed");
}

export function criticalJobFieldsLocked(status: JobStatus): boolean {
  return isSamplingOrLater(status);
}

export function nextJobStatus(status: JobStatus): JobStatus | null {
  return NEXT_STATUS[status];
}

export function nextJobLabel(status: JobStatus): string {
  return NEXT_LABEL[status];
}

export function jobHasChildren(data: LimsData, jobId: string): boolean {
  return (
    data.samples.some((s) => s.jobId === jobId) ||
    data.samplingEvents.some((e) => e.jobId === jobId) ||
    data.lhuRecords.some((l) => l.jobId === jobId) ||
    data.invoices.some((i) => i.jobId === jobId)
  );
}

function gateEdit(status: JobStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk mengedit.");
  if (canChangeJobCustomer(status, role) || canEditJobSite(status, role) || canEditJobDueOrScope(status, role)) {
    return allow();
  }
  if (!WRITE_ROLES.includes(role) && role !== "admin") {
    return deny("Hanya Sales atau Admin yang mengedit field job.");
  }
  return deny("Field kritis terkunci. Lanjutkan lewat aksi status.");
}

function gateNext(status: JobStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk mengubah status.");
  const to = NEXT_STATUS[status];
  const roles = NEXT_ROLES[status];
  if (!to || !roles) return deny("Tidak ada transisi berikutnya.");
  if (!roles.includes(role)) {
    return deny(`Hanya ${roles.map((r) => r).join("/")} yang boleh ke ${JOB_STATUS_LABELS[to]}.`);
  }
  return allow();
}

function gateCancel(status: JobStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk membatalkan.");
  if (status === "cancelled" || status === "closed") {
    return deny("Job sudah terminal.");
  }
  if (JOB_EARLY_CANCEL_STATUSES.includes(status)) {
    if (!WRITE_ROLES.includes(role)) return deny("Hanya Sales atau Admin yang membatalkan draf/jadwal.");
    return allow();
  }
  if (JOB_ADMIN_CANCEL_STATUSES.includes(status)) {
    if (role !== "admin") return deny("Pembatalan setelah sampling hanya Admin + alasan.");
    return allow();
  }
  return deny("Pembatalan tidak tersedia.");
}

function allJobActions(job: Job, actor: SessionUser | null): JobGatedAction[] {
  const role = actor?.role;
  const edit = gateEdit(job.status, role);
  const next = gateNext(job.status, role);
  const cancel = gateCancel(job.status, role);
  const to = next.allowed ? NEXT_STATUS[job.status] : null;

  return [
    {
      key: "edit",
      label: "Edit",
      allowed: edit.allowed,
      reason: edit.reason,
      toStatus: null,
      override: false,
      reasonRequired: false,
    },
    {
      key: "next",
      label: nextJobLabel(job.status),
      allowed: next.allowed,
      reason: next.reason,
      toStatus: to,
      override: false,
      reasonRequired: false,
    },
    {
      key: "cancel",
      label: "Batalkan",
      allowed: cancel.allowed,
      reason: cancel.reason,
      toStatus: cancel.allowed ? "cancelled" : null,
      override: false,
      reasonRequired: Boolean(cancel.allowed && isSamplingOrLater(job.status)),
    },
  ];
}

/**
 * Product lock: hide illegal actions (do not render them disabled).
 * Same pattern as sampleActionsFor.
 */
export function jobActionsFor(job: Job, actor: SessionUser | null): JobGatedAction[] {
  return allJobActions(job, actor).filter((action) => action.allowed);
}

export function jobStepperIndex(status: JobStatus): number {
  if (status === "cancelled") return -1;
  return JOB_STEPPER.indexOf(status);
}

export function jobStatusCaption(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export function isValidDueDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const date = new Date(`${trimmed}T00:00:00+07:00`);
  return !Number.isNaN(date.getTime());
}
