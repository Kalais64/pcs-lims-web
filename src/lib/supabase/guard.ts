import type { SupabaseClient } from "@supabase/supabase-js";
import { isForbiddenTable } from "@/lib/data/forbidden";

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
    "or",
    "contains",
    "containedBy",
    "abortSignal",
    "csv",
    "throwOnError",
    "returns",
    "overrideTypes",
  ]) {
    builder[method] = chain;
  }
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

/** Never issue HTTP to units / lab_samples / sample_records. */
export function guardSupabase<T extends SupabaseClient>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (relation: string) => {
          if (isForbiddenTable(relation)) {
            return blockedBuilder();
          }
          return target.from(relation);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  }) as T;
}
