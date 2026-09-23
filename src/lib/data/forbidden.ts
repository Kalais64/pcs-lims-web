/** Backend schema facts — do not query these tables over HTTP. */
export const FORBIDDEN_TABLES = new Set(["units", "unit", "lab_samples", "sample_records"]);

/** Phantom sample columns — never SELECT or write these on public.samples. */
export const FORBIDDEN_COLUMNS = new Set([
  "client_code",
  "sample_no",
  "sample_number",
  "sampled_at",
  "condition_notes",
  "verified_by_id",
  "approved_by_id",
  "reject_reason",
  "rejection_reason",
]);

export function isForbiddenTable(name: string) {
  return FORBIDDEN_TABLES.has(name);
}

export function stripForbiddenColumns(payload: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_COLUMNS.has(key)) continue;
    next[key] = value;
  }
  return next;
}

export function missingColumnName(message: string): string | null {
  const match =
    message.match(/['"]([a-zA-Z0-9_]+)['"] column/i) ||
    message.match(/column ['"]([a-zA-Z0-9_]+)['"]/i);
  return match?.[1] ?? null;
}

export function isMissingColumnError(message: string) {
  return /PGRST204|['"][a-zA-Z0-9_]+['"] column/i.test(message);
}

export function isMissingTableError(message: string) {
  if (isMissingColumnError(message) && /column/i.test(message)) return false;
  return /does not exist|PGRST205|Could not find the table|relation .* does not exist/i.test(message);
}
