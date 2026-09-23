import type { Role, SessionUser } from "@/lib/auth/types";
import type { Sample } from "@/lib/domain/types";
import { SAMPLE_STATUSES, SAMPLE_STATUS_LABELS, type SampleStatus } from "@/lib/status/sample";

export const SAMPLE_FREE_EDIT_STATUSES: readonly SampleStatus[] = ["expected", "received"];

export const SAMPLE_ARCHIVE_STATUSES: readonly SampleStatus[] = ["expected", "received"];

export const SAMPLE_REJECT_STATUSES: readonly SampleStatus[] = ["pending_verify", "pending_approve"];

export const SAMPLE_STEPPER: readonly SampleStatus[] = [
  "expected",
  "received",
  "in_testing",
  "pending_verify",
  "pending_approve",
  "approved",
];

export type SampleActionKey = "edit" | "archive" | "submit" | "verify" | "approve" | "reject";

export type SampleGatedAction = {
  key: SampleActionKey;
  label: string;
  allowed: boolean;
  reason: string | null;
  toStatus: SampleStatus | null;
  override: boolean;
};

const EDIT_ROLES: readonly Role[] = ["admin", "sampler", "analyst"];
const ARCHIVE_ROLES: readonly Role[] = ["admin", "sampler", "analyst"];
const SUBMIT_ROLES: readonly Role[] = ["admin", "analyst"];
const VERIFY_ROLES: readonly Role[] = ["admin", "verifier"];
const APPROVE_ROLES: readonly Role[] = ["admin", "approver"];
const REJECT_ROLES: readonly Role[] = ["admin", "verifier", "approver"];

export function canFreeEditSample(status: SampleStatus, role: Role | undefined): boolean {
  return Boolean(role && EDIT_ROLES.includes(role) && SAMPLE_FREE_EDIT_STATUSES.includes(status));
}

export function criticalFieldsLocked(status: SampleStatus): boolean {
  return !SAMPLE_FREE_EDIT_STATUSES.includes(status);
}

export function submitTarget(status: SampleStatus): SampleStatus | null {
  if (status === "received") return "in_testing";
  if (status === "in_testing" || status === "rejected") return "pending_verify";
  return null;
}

export function submitLabel(status: SampleStatus): string {
  if (status === "received") return "Kirim ke pengujian";
  if (status === "in_testing") return "Kirim verifikasi";
  if (status === "rejected") return "Kirim ulang verifikasi";
  return "Kirim";
}

function deny(reason: string): { allowed: false; reason: string } {
  return { allowed: false, reason };
}

function allow(): { allowed: true; reason: null } {
  return { allowed: true, reason: null };
}

function gateEdit(status: SampleStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk mengedit.");
  if (!EDIT_ROLES.includes(role)) return deny("Hanya Sampler, Analis penerimaan, atau Admin.");
  if (!SAMPLE_FREE_EDIT_STATUSES.includes(status)) {
    return deny("Field kritis terkunci setelah pengujian dimulai.");
  }
  return allow();
}

function gateArchive(status: SampleStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk mengarsipkan.");
  if (!ARCHIVE_ROLES.includes(role)) return deny("Hanya Sampler, Analis, atau Admin yang boleh arsip.");
  if (!SAMPLE_ARCHIVE_STATUSES.includes(status)) {
    return deny("Arsip hanya dari Diharapkan atau Diterima (bukan hapus keras).");
  }
  return allow();
}

function gateSubmit(status: SampleStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk mengirim.");
  if (!SUBMIT_ROLES.includes(role)) return deny("Hanya Analis atau Admin yang mengirim jalur uji/verifikasi.");
  const to = submitTarget(status);
  if (!to) return deny("Kirim hanya dari Diterima, Pengujian, atau Ditolak (ulang).");
  return allow();
}

function gateVerify(status: SampleStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk verifikasi.");
  if (!VERIFY_ROLES.includes(role)) return deny("Hanya Verifier atau Admin.");
  if (status !== "pending_verify") return deny("Verify hanya saat Menunggu verifikasi.");
  return allow();
}

function gateApprove(
  sample: Sample,
  role: Role | undefined,
  actorId: string | undefined,
): { allowed: boolean; reason: string | null; override: boolean } {
  if (!role || !actorId) return { ...deny("Masuk untuk approve."), override: false };
  if (!APPROVE_ROLES.includes(role)) {
    return { ...deny("Hanya Approver atau Admin."), override: false };
  }
  if (sample.status === "pending_approve") {
    if (sample.verifiedById && sample.verifiedById === actorId && role !== "admin") {
      return { ...deny("Dual control: Verify ≠ Approve (dua pengguna)."), override: false };
    }
    if (sample.verifiedById && sample.verifiedById === actorId && role === "admin") {
      return {
        allowed: true,
        reason: "Override Admin: Anda juga verifier — aksi diaudit.",
        override: true,
      };
    }
    return { allowed: true, reason: null, override: false };
  }
  if (sample.status === "pending_verify" && role === "admin") {
    return {
      allowed: true,
      reason: "Override Admin: lewati Verify — aksi diaudit.",
      override: true,
    };
  }
  return { ...deny("Approve setelah verifikasi (kecuali override Admin)."), override: false };
}

function gateReject(status: SampleStatus, role: Role | undefined) {
  if (!role) return deny("Masuk untuk menolak.");
  if (!REJECT_ROLES.includes(role)) return deny("Hanya Verifier, Approver, atau Admin.");
  if (!SAMPLE_REJECT_STATUSES.includes(status)) {
    return deny("Tolak hanya pada jalur verifikasi/approval.");
  }
  return allow();
}

export function sampleActionsFor(sample: Sample, actor: SessionUser | null): SampleGatedAction[] {
  const role = actor?.role;
  const edit = gateEdit(sample.status, role);
  const archive = gateArchive(sample.status, role);
  const submit = gateSubmit(sample.status, role);
  const verify = gateVerify(sample.status, role);
  const approve = gateApprove(sample, role, actor?.id);
  const reject = gateReject(sample.status, role);

  return [
    {
      key: "edit",
      label: "Edit",
      allowed: edit.allowed,
      reason: edit.reason,
      toStatus: null,
      override: false,
    },
    {
      key: "archive",
      label: "Arsipkan",
      allowed: archive.allowed,
      reason: archive.reason,
      toStatus: archive.allowed ? "archived" : null,
      override: false,
    },
    {
      key: "submit",
      label: submitLabel(sample.status),
      allowed: submit.allowed,
      reason: submit.reason,
      toStatus: submit.allowed ? submitTarget(sample.status) : null,
      override: false,
    },
    {
      key: "verify",
      label: "Verifikasi",
      allowed: verify.allowed,
      reason: verify.reason,
      toStatus: verify.allowed ? "pending_approve" : null,
      override: false,
    },
    {
      key: "approve",
      label: approve.override ? "Setujui (override)" : "Setujui",
      allowed: approve.allowed,
      reason: approve.reason,
      toStatus: approve.allowed ? "approved" : null,
      override: approve.override,
    },
    {
      key: "reject",
      label: "Tolak",
      allowed: reject.allowed,
      reason: reject.reason,
      toStatus: reject.allowed ? "rejected" : null,
      override: false,
    },
  ];
}

export function stepperIndex(status: SampleStatus): number {
  if (status === "rejected" || status === "archived") return -1;
  return SAMPLE_STEPPER.indexOf(status);
}

export function sampleStatusCaption(status: SampleStatus): string {
  return SAMPLE_STATUS_LABELS[status] ?? status;
}

export const SAMPLE_STATUS_ORDER = SAMPLE_STATUSES;
