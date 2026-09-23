import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_DATA } from "@/lib/data/empty";
import {
  asMatrices,
  asMethods,
  asParameters,
  mapAudit,
  mapCustomers,
  mapInvoices,
  mapJobs,
  mapLhu,
  mapProfiles,
  mapResults,
  mapSamples,
  mapSampling,
  mapSites,
  unitsFromParameters,
} from "@/lib/data/mappers";
import { FORBIDDEN_COLUMNS, missingColumnName } from "@/lib/data/forbidden";
import { selectAll, TABLE_CANDIDATES, resolveTable } from "@/lib/data/tables";
import type { LimsData, Sample } from "@/lib/domain/types";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; error?: string }> {
  try {
    return { value: await fn() };
  } catch (error) {
    return { value: fallback, error: error instanceof Error ? error.message : "Gagal memuat data." };
  }
}

const SAMPLE_COLUMNS = [
  "id",
  "sample_id",
  "sample_no",
  "sample_number",
  "sample_code",
  "code",
  "job_id",
  "matrix_id",
  "status",
  "received_at",
  "collected_at",
  "sampled_at",
  "barcode",
  "storage_location",
  "condition_notes",
  "receive_notes",
  "notes",
  "verified_by",
  "verified_by_id",
  "approved_by",
  "approved_by_id",
  "reject_reason",
  "rejection_reason",
  "created_at",
].join(",");

async function loadSamples(client: SupabaseClient): Promise<Sample[]> {
  let last = "";
  for (const name of TABLE_CANDIDATES.samples) {
    const columns = SAMPLE_COLUMNS.split(",").filter((col) => !FORBIDDEN_COLUMNS.has(col));
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data, error } = await client.from(name).select(columns.join(","));
      if (!error && data) return mapSamples(data);
      last = error?.message ?? last;
      const missing = error ? missingColumnName(error.message) : null;
      if (missing && columns.includes(missing)) {
        columns.splice(columns.indexOf(missing), 1);
        continue;
      }
      break;
    }
  }
  try {
    const table = await resolveTable(client, "samples", TABLE_CANDIDATES.samples);
    const columns = SAMPLE_COLUMNS.split(",").filter((col) => !FORBIDDEN_COLUMNS.has(col));
    const { data, error } = await client.from(table).select(columns.join(","));
    if (error) throw new Error(error.message);
    return mapSamples(data);
  } catch (error) {
    throw new Error(last || (error instanceof Error ? error.message : "Gagal memuat samples."));
  }
}

export async function loadLiveData(client: SupabaseClient): Promise<{ data: LimsData; error: string | null }> {
  const errors: string[] = [];
  const take = async <T>(key: Parameters<typeof selectAll>[1], map: (raw: unknown) => T, fallback: T) => {
    const result = await safe(async () => map((await selectAll(client, key)).data), fallback);
    if (result.error) errors.push(`${key}: ${result.error}`);
    return result.value;
  };

  const parameters = await take("parameters", asParameters, []);
  const samplesResult = await safe(() => loadSamples(client), []);
  if (samplesResult.error) errors.push(`samples: ${samplesResult.error}`);

  const data: LimsData = {
    ...EMPTY_DATA,
    profiles: await take("profiles", mapProfiles, []),
    customers: await take("customers", mapCustomers, []),
    sites: await take("sites", mapSites, []),
    matrices: await take("matrices", asMatrices, []),
    parameters,
    methods: await take("methods", asMethods, []),
    units: unitsFromParameters(parameters),
    jobs: await take("jobs", mapJobs, []),
    samplingEvents: await take("samplingEvents", mapSampling, []),
    samples: samplesResult.value,
    results: await take("results", mapResults, []),
    lhuRecords: await take("lhu", mapLhu, []),
    invoices: await take("invoices", mapInvoices, []),
    auditLogs: await take("audit", mapAudit, []),
  };

  const operational = errors.filter((item) => !/^(profiles|audit|lhu|invoices|samplingEvents):/.test(item));
  return { data, error: operational.length ? operational.join(" · ") : null };
}
