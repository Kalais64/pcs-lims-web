import type { SupabaseClient } from "@supabase/supabase-js";
import { isForbiddenTable, missingColumnName, stripForbiddenColumns } from "@/lib/data/forbidden";
import {
  AUDIT_SELECT,
  MATRIX_SELECT,
  METHOD_SELECT,
  PARAMETER_SELECT,
} from "@/lib/data/master-schema";
import { SAMPLE_SELECT } from "@/lib/data/samples-schema";

export { SAMPLE_SELECT } from "@/lib/data/samples-schema";

const SELECT_BY_KEY: Partial<Record<keyof typeof TABLE_CANDIDATES, string>> = {
  samples: SAMPLE_SELECT,
  matrices: MATRIX_SELECT,
  methods: METHOD_SELECT,
  parameters: PARAMETER_SELECT,
  audit: AUDIT_SELECT,
};

/** Locked public schema names — no HTTP probes, no alias fallbacks. */
export const TABLE_CANDIDATES = {
  profiles: ["profiles"],
  customers: ["customers"],
  sites: ["customer_sites"],
  matrices: ["matrices"],
  parameters: ["parameters"],
  methods: ["methods"],
  jobs: ["jobs"],
  samplingEvents: ["sampling_events"],
  samples: ["samples"],
  results: ["test_results"],
  lhu: ["lhu_documents"],
  invoices: ["invoices"],
  audit: ["audit_logs"],
} as const;

export function resolveTable(key: keyof typeof TABLE_CANDIDATES) {
  const name = TABLE_CANDIDATES[key][0];
  if (isForbiddenTable(name)) {
    throw new Error(`Tabel ${key} dilarang.`);
  }
  return name;
}

export async function selectAll(client: SupabaseClient, key: keyof typeof TABLE_CANDIDATES) {
  const table = resolveTable(key);
  const select = SELECT_BY_KEY[key] ?? "*";
  const { data, error } = await client.from(table).select(select);
  if (error) throw new Error(error.message);
  return { table, data };
}

function dropColumn(payload: Record<string, unknown>, column: string) {
  const next = { ...payload };
  delete next[column];
  return next;
}

function assertClientWritable(key: keyof typeof TABLE_CANDIDATES) {
  if (key === "audit") {
    throw new Error("audit_logs append-only: tulis dari klien dilarang.");
  }
}

export async function insertRow(
  client: SupabaseClient,
  key: keyof typeof TABLE_CANDIDATES,
  payloads: Record<string, unknown>[],
) {
  assertClientWritable(key);
  const table = resolveTable(key);
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
  assertClientWritable(key);
  const table = resolveTable(key);
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
  assertClientWritable(key);
  const table = resolveTable(key);
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) throw new Error(error.message);
}
