/** Empty / whitespace UUID strings must never reach PostgREST (22P02). */

const UUID_FK_KEYS = new Set([
  "site_id",
  "customer_id",
  "quotation_id",
  "customer_site_id",
  "created_by",
]);

export function uuidOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed;
}

export function omitEmptyUuidFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (UUID_FK_KEYS.has(key)) {
      const uuid = uuidOrNull(value);
      if (uuid == null) continue;
      next[key] = uuid;
      continue;
    }
    next[key] = value;
  }
  return next;
}
