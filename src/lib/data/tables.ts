import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isForbiddenTable,
  isMissingColumnError,
  isMissingTableError,
  missingColumnName,
  stripForbiddenColumns,
} from "@/lib/data/forbidden";

const cache = new Map<string, string>();

export async function resolveTable(client: SupabaseClient, key: string, names: readonly string[]) {
  const hit = cache.get(key);
  if (hit) return hit;
  let last = "";
  for (const name of names) {
    if (isForbiddenTable(name)) continue;
    const { error } = await client.from(name).select("id").limit(1);
    if (!error) {
      cache.set(key, name);
      return name;
    }
    last = error.message;
    if (isMissingColumnError(error.message)) {
      const retry = await client.from(name).select("*").limit(1);
      if (!retry.error) {
        cache.set(key, name);
        return name;
      }
      last = retry.error.message;
      if (isMissingTableError(retry.error.message)) continue;
      cache.set(key, name);
      return name;
    }
    if (isMissingTableError(error.message)) continue;
    cache.set(key, name);
    return name;
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
  jobs: ["jobs"],
  samplingEvents: ["sampling_events", "samplings"],
  samples: ["samples", "lab_samples", "sample_records"],
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

function dropColumn(payload: Record<string, unknown>, column: string) {
  const next = { ...payload };
  delete next[column];
  return next;
}

export async function insertRow(
  client: SupabaseClient,
  key: keyof typeof TABLE_CANDIDATES,
  payloads: Record<string, unknown>[],
) {
  const table = await resolveTable(client, key, TABLE_CANDIDATES[key]);
  let last = "Insert gagal.";
  for (const raw of payloads) {
    let payload = stripForbiddenColumns(raw);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await client.from(table).insert(payload).select("id").limit(1);
      if (!error) return { table, row: data?.[0] as Record<string, unknown> | undefined };
      last = error.message;
      const col = missingColumnName(error.message);
      if (col && col in payload) {
        payload = dropColumn(payload, col);
        continue;
      }
      break;
    }
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
  for (const raw of payloads) {
    let payload = stripForbiddenColumns(raw);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await client.from(table).update(payload).eq("id", id);
      if (!error) return;
      last = error.message;
      const col = missingColumnName(error.message);
      if (col && col in payload) {
        payload = dropColumn(payload, col);
        continue;
      }
      break;
    }
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
