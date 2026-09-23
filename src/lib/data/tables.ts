import type { SupabaseClient } from "@supabase/supabase-js";

const cache = new Map<string, string>();

export async function resolveTable(client: SupabaseClient, key: string, names: string[]) {
  const hit = cache.get(key);
  if (hit) return hit;
  let last = "";
  for (const name of names) {
    const { error } = await client.from(name).select("*").limit(1);
    if (!error) {
      cache.set(key, name);
      return name;
    }
    last = error.message;
    if (!/does not exist|PGRST205|schema cache|not find/i.test(error.message)) {
      cache.set(key, name);
      return name;
    }
  }
  throw new Error(last || `Tabel ${key} tidak ditemukan.`);
}

export const TABLE_CANDIDATES = {
  profiles: ["profiles", "staff_profiles", "users"],
  customers: ["customers"],
  sites: ["customer_sites", "sites"],
  matrices: ["matrices", "sample_matrices"],
  parameters: ["parameters", "test_parameters"],
  methods: ["methods", "test_methods"],
  units: ["units"],
  jobs: ["jobs"],
  samplingEvents: ["sampling_events", "samplings"],
  samples: ["samples"],
  results: ["test_results", "results", "sample_results"],
  lhu: ["lhu_documents", "lhu_records"],
  invoices: ["invoices"],
  audit: ["audit_logs"],
};

export async function selectAll(client: SupabaseClient, key: keyof typeof TABLE_CANDIDATES) {
  const table = await resolveTable(client, key, TABLE_CANDIDATES[key]);
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(error.message);
  return { table, data };
}

export async function insertRow(
  client: SupabaseClient,
  key: keyof typeof TABLE_CANDIDATES,
  payloads: Record<string, unknown>[],
) {
  const table = await resolveTable(client, key, TABLE_CANDIDATES[key]);
  let last = "Insert gagal.";
  for (const payload of payloads) {
    const { data, error } = await client.from(table).insert(payload).select("*").limit(1);
    if (!error) return { table, row: data?.[0] as Record<string, unknown> | undefined };
    last = error.message;
  }
  throw new Error(last);
}

export async function updateRow(
  client: SupabaseClient,
  key: keyof typeof TABLE_CANDIDATES,
  id: string,
  payloads: Record<string, unknown>[],
) {
  const table = await resolveTable(client, key, TABLE_CANDIDATES[key]);
  let last = "Update gagal.";
  for (const payload of payloads) {
    const { error } = await client.from(table).update(payload).eq("id", id);
    if (!error) return;
    last = error.message;
  }
  throw new Error(last);
}

export async function deleteWhere(
  client: SupabaseClient,
  key: keyof typeof TABLE_CANDIDATES,
  column: string,
  value: string,
) {
  const table = await resolveTable(client, key, TABLE_CANDIDATES[key]);
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) throw new Error(error.message);
}
