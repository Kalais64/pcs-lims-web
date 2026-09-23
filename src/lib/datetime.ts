/** Safe calendar/time formatting — never throw "Invalid time value". */
export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "Invalid Date") return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function safeIso(value?: string | number | Date | null): string {
  const date = value == null || value === "" ? new Date() : parseDate(value);
  return (date ?? new Date()).toISOString();
}

export function formatDateTimeId(value: string | number | Date | null | undefined, empty = "—"): string {
  const date = parseDate(value);
  if (!date) return empty;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return empty;
  }
}

export function formatDateId(value: string | number | Date | null | undefined, empty = "—"): string {
  const raw = value?.trim() ?? "";
  const date = parseDate(raw.includes("T") ? raw : raw ? `${raw}T00:00:00` : "");
  if (!date) return empty;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return empty;
  }
}

export function toLocalInput(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  const d = parseDate(value);
  return d ? d.toISOString() : null;
}
