import type { SupabaseClient } from "@supabase/supabase-js";
import { isForbiddenTable } from "@/lib/data/forbidden";

const BLOCKED = new Set(["units", "unit", "lab_samples", "sample_records"]);

function blockedBuilder() {
  const result = { data: null, error: { message: "blocked table", code: "PGRST205" } };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "in",
    "is",
    "gt",
    "lt",
    "gte",
    "lte",
    "order",
    "limit",
    "range",
    "maybeSingle",
    "single",
    "filter",
    "match",
    "not",
  ]) {
    builder[method] = chain;
  }
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

/** Never issue HTTP to units / lab_samples / sample_records. */
export function guardSupabase<T extends SupabaseClient>(client: T): T {
  const original = client.from.bind(client);
  const from = (relation: string) => {
    if (isForbiddenTable(relation) || BLOCKED.has(relation)) {
      return blockedBuilder();
    }
    return original(relation);
  };
  Object.assign(client, { from });
  return client;
}
