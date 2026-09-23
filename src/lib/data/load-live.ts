import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_DATA } from "@/lib/data/empty";
import {
  asMatrices,
  asMethods,
  asParameters,
  asUnits,
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
} from "@/lib/data/mappers";
import { selectAll } from "@/lib/data/tables";
import type { LimsData } from "@/lib/domain/types";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; error?: string }> {
  try {
    return { value: await fn() };
  } catch (error) {
    return { value: fallback, error: error instanceof Error ? error.message : "Gagal memuat data." };
  }
}

export async function loadLiveData(client: SupabaseClient): Promise<{ data: LimsData; error: string | null }> {
  const errors: string[] = [];
  const take = async <T>(key: Parameters<typeof selectAll>[1], map: (raw: unknown) => T, fallback: T) => {
    const result = await safe(async () => map((await selectAll(client, key)).data), fallback);
    if (result.error) errors.push(`${key}: ${result.error}`);
    return result.value;
  };

  const data: LimsData = {
    ...EMPTY_DATA,
    profiles: await take("profiles", mapProfiles, []),
    customers: await take("customers", mapCustomers, []),
    sites: await take("sites", mapSites, []),
    matrices: await take("matrices", asMatrices, []),
    parameters: await take("parameters", asParameters, []),
    methods: await take("methods", asMethods, []),
    units: await take("units", asUnits, []),
    jobs: await take("jobs", mapJobs, []),
    samplingEvents: await take("samplingEvents", mapSampling, []),
    samples: await take("samples", mapSamples, []),
    results: await take("results", mapResults, []),
    lhuRecords: await take("lhu", mapLhu, []),
    invoices: await take("invoices", mapInvoices, []),
    auditLogs: await take("audit", mapAudit, []),
  };

  return { data, error: errors.length ? errors.join(" · ") : null };
}
