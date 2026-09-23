import type { SupabaseClient } from "@supabase/supabase-js";
import { isForbiddenTable } from "@/lib/data/forbidden";

/** Block GET /rest/v1/units — no units table; satuan is text on parameters. */
export function guardSupabase<T extends SupabaseClient>(client: T): T {
  const original = client.from.bind(client);
  Object.assign(client, {
    from(relation: string) {
      if (isForbiddenTable(relation)) {
        return original("parameters").select("unit,satuan,default_unit").limit(0);
      }
      return original(relation);
    },
  });
  return client;
}
