export function pickString(row: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

export function pickNullable(row: Record<string, unknown>, keys: string[]): string | null {
  const value = pickString(row, keys, "");
  return value === "" ? null : value;
}

export function pickBool(row: Record<string, unknown>, keys: string[], fallback = true): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true" || value === "t") return true;
    if (value === 0 || value === "0" || value === "false" || value === "f") return false;
  }
  return fallback;
}

export function pickNumber(row: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

export function asRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

export function dateOnly(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}
