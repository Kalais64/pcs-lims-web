import { parseDate } from "@/lib/datetime";
import type { AuditLog } from "@/lib/domain/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function field(data: Record<string, unknown> | null, keys: string[]): unknown {
  if (!data) return undefined;
  for (const key of keys) {
    if (key in data && data[key] != null) return data[key];
  }
  return undefined;
}

export function auditFromStatus(log: AuditLog): string {
  const fromNew = field(log.newData, ["from_status", "fromStatus"]);
  const fromOld = field(log.oldData, ["status"]);
  return fromNew != null ? String(fromNew) : fromOld != null ? String(fromOld) : "";
}

export function auditToStatus(log: AuditLog): string {
  const to = field(log.newData, ["to_status", "toStatus", "status"]);
  return to != null ? String(to) : "";
}

export function auditOverride(log: AuditLog): boolean {
  const value = field(log.newData, ["override"]);
  return value === true || value === "true";
}

export function auditReason(log: AuditLog): string {
  const value = field(log.newData, ["reason"]);
  return value != null ? String(value) : "";
}

export function auditActiveFlag(log: AuditLog): boolean | null {
  const next = field(log.newData, ["is_active"]);
  if (typeof next === "boolean") return next;
  if (next === "true" || next === true) return true;
  if (next === "false") return false;
  return null;
}

export function auditSampleCode(log: AuditLog): string {
  const code = field(log.newData, ["sample_code"]) ?? field(log.oldData, ["sample_code"]);
  return code != null ? String(code) : "";
}

export function summarizeAudit(log: AuditLog): string {
  const parts: string[] = [];
  const from = auditFromStatus(log);
  const to = auditToStatus(log);
  if (from || to) parts.push(`${from || "—"} → ${to || "—"}`);
  if (auditOverride(log)) parts.push("override");
  const reason = auditReason(log);
  if (reason) parts.push(reason);
  const active = auditActiveFlag(log);
  if (active === true) parts.push("is_active: aktif");
  if (active === false) parts.push("is_active: nonaktif");
  const code = field(log.newData, ["code"]) ?? field(log.oldData, ["code"]);
  const name = field(log.newData, ["name"]) ?? field(log.oldData, ["name"]);
  if (code) parts.push(`kode ${String(code)}`);
  if (name) parts.push(String(name));
  return parts.join(" · ") || log.action;
}

export function auditInDateRange(
  occurredAt: string,
  fromDate: string,
  toDate: string,
): boolean {
  const occurred = parseDate(occurredAt);
  if (!occurred) return false;
  if (fromDate) {
    const start = parseDate(`${fromDate}T00:00:00+07:00`);
    if (start && occurred.getTime() < start.getTime()) return false;
  }
  if (toDate) {
    const end = parseDate(`${toDate}T23:59:59.999+07:00`);
    if (end && occurred.getTime() > end.getTime()) return false;
  }
  return true;
}

export function asJsonRecord(value: unknown): Record<string, unknown> | null {
  return asRecord(value);
}
