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
import { SAMPLE_SELECT, selectAll } from "@/lib/data/tables";
import type { LimsData, Sample } from "@/lib/domain/types";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; error?: string }> {
  try {
    return { value: await fn() };
  } catch (error) {
    return { value: fallback, error: error instanceof Error ? error.message : "Gagal memuat data." };
  }
}

async function loadSamples(client: SupabaseClient): Promise<Sample[]> {
  const { data, error } = await client.from("samples").select(SAMPLE_SELECT);
  if (error) throw new Error(error.message);
  return mapSamples(data);
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
