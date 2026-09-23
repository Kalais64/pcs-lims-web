"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_DATA } from "@/lib/data/empty";
import { loadLiveData } from "@/lib/data/load-live";
import { insertRow, updateRow, deleteWhere } from "@/lib/data/tables";
import {
  transitionInvoice,
  transitionJob,
  transitionLhu,
  transitionSample,
} from "@/lib/data/rpc";
import { nextInvoiceNo, nextJobNo, nextLhuNo, nextSampleNo, nowIso } from "@/lib/domain/ids";
import type { Invoice, LimsData, SampleFreeFields, SamplingEvent } from "@/lib/domain/types";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deriveJobStatus } from "@/lib/store/sync-job";
import { LimsContext, type ActionResult, type LimsContextValue, type MasterInput, type MasterKind } from "@/lib/store/context";
import type { RuntimeMode } from "@/lib/config/runtime";
import { canFreeEditSample, SAMPLE_ARCHIVE_STATUSES, submitTarget } from "@/lib/status/sample-gate";

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function optionalNumber(value?: string): number | string | null {
  if (value == null || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function masterPayload(kind: MasterKind, item: MasterInput): Record<string, unknown> {
  if (kind === "matrices") {
    return {
      code: item.code.trim(),
      name: item.name.trim(),
      description: item.description?.trim() || null,
      is_active: item.isActive ?? true,
    };
  }
  if (kind === "methods") {
    return {
      code: item.code.trim(),
      name: item.name.trim(),
      standard_ref: item.standardRef?.trim() || null,
      description: item.description?.trim() || null,
      is_active: item.isActive ?? true,
    };
  }
  return {
    code: item.code.trim(),
    name: item.name.trim(),
    unit: item.unit?.trim() || null,
    method_id: item.methodId || null,
    matrix_id: item.matrixId || null,
    loq: optionalNumber(item.loq),
    baku_mutu: optionalNumber(item.bakuMutu),
    is_active: item.isActive ?? true,
  };
}

function sampleFieldPayloads(fields: SampleFreeFields): Record<string, unknown>[] {
  return [
    {
      matrix_id: fields.matrixId,
      sample_code: fields.sampleCode,
      receive_notes: fields.receiveNotes,
      notes: fields.notes,
      barcode: fields.barcode,
      storage_location: fields.storageLocation,
      collected_at: fields.collectedAt,
    },
  ];
}

async function syncJob(client: SupabaseClient, data: LimsData, jobId: string) {
  const next = deriveJobStatus(data, jobId);
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job || job.status === next) return;
  await transitionJob(client, jobId, next);
}

export function LiveLimsProvider({
  mode,
  children,
}: {
  mode: RuntimeMode;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<LimsData>(EMPTY_DATA);
  const [loadError, setLoadError] = useState<string | null>(
    mode === "empty" ? "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum di-set. Data live kosong." : null,
  );
  const [isLoading, setIsLoading] = useState(mode === "live");

  const refresh = useCallback(async () => {
    if (mode !== "live") {
      setData(EMPTY_DATA);
      return;
    }
    const client = createBrowserSupabase();
    if (!client) {
      setLoadError("Klien Supabase tidak tersedia.");
      setData(EMPTY_DATA);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const loaded = await loadLiveData(client);
      setData(loaded.data);
      setLoadError(loaded.error);
    } catch (error) {
      setData(EMPTY_DATA);
      setLoadError(error instanceof Error ? error.message : "Gagal memuat data Supabase.");
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withClient = useCallback(async (fn: (client: SupabaseClient) => Promise<ActionResult>) => {
    const client = createBrowserSupabase();
    if (!client) return fail("Supabase belum dikonfigurasi.");
    try {
      return await fn(client);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Operasi gagal.");
    }
  }, []);

  const upsertCustomer: LimsContextValue["upsertCustomer"] = useCallback(
    (input) => {
      const id = input.id ?? crypto.randomUUID();
      void withClient(async (client) => {
        await insertRow(client, "customers", [
          {
            id,
            company_name: input.companyName,
            name: input.companyName,
            pic: input.pic,
            email: input.email,
            phone: input.phone,
            address: input.address,
          },
        ]);
        await refresh();
        return { ok: true };
      });
      return id;
    },
    [refresh, withClient],
  );

  const upsertSite: LimsContextValue["upsertSite"] = useCallback(
    (input) => {
      const id = input.id ?? crypto.randomUUID();
      void withClient(async (client) => {
        await insertRow(client, "sites", [
          { id, customer_id: input.customerId, name: input.name, address: input.address },
        ]);
        await refresh();
        return { ok: true };
      });
      return id;
    },
    [refresh, withClient],
  );

  const createJob: LimsContextValue["createJob"] = useCallback(
    (input) => {
      const id = crypto.randomUUID();
      const jobNo = nextJobNo(data.jobs.map((j) => j.jobNo));
      void withClient(async (client) => {
        await insertRow(client, "jobs", [
          {
            id,
            number: jobNo,
            customer_id: input.customerId,
            site_id: input.siteId,
            due_date: input.dueDate || null,
            scope_notes: input.scope,
            status: "draft",
          },
        ]);
        await refresh();
        return { ok: true };
      });
      return id;
    },
    [data.jobs, refresh, withClient],
  );

  const scheduleJob: LimsContextValue["scheduleJob"] = useCallback(
    (jobId) =>
      withClient(async (client) => {
        const res = await transitionJob(client, jobId, "scheduled");
        await refresh();
        return res;
      }),
    [refresh, withClient],
  );

  const createSampling: LimsContextValue["createSampling"] = useCallback(
    (input) => {
      const id = crypto.randomUUID();
      void withClient(async (client) => {
        await insertRow(client, "samplingEvents", [
          {
            id,
            job_id: input.jobId,
            site_id: input.siteId,
            date: input.date,
            scheduled_date: input.date,
            petugas: input.petugas,
            sampler_name: input.petugas,
            status: "scheduled",
          },
        ]);
        await transitionJob(client, input.jobId, "sampling");
        await refresh();
        return { ok: true };
      });
      return id;
    },
    [refresh, withClient],
  );

  const markSamplingDone = useCallback(
    (id: string) => {
      void withClient(async (client) => {
        await updateRow(client, "samplingEvents", id, [{ status: "done" }]);
        const ev = data.samplingEvents.find((e) => e.id === id);
        if (ev) await syncJob(client, data, ev.jobId);
        await refresh();
        return { ok: true };
      });
    },
    [data, refresh, withClient],
  );

  const createSample: LimsContextValue["createSample"] = useCallback(
    (input) => {
      const id = crypto.randomUUID();
      const sampleNo = nextSampleNo(data.samples.map((s) => s.sampleNo));
      void withClient(async (client) => {
        await insertRow(client, "samples", [
          {
            id,
            sample_code: sampleNo,
            job_id: input.jobId,
            matrix_id: input.matrixId,
            status: "expected",
          },
        ]);
        await syncJob(
          client,
          {
            ...data,
            samples: [
              ...data.samples,
              {
                ...input,
                id,
                sampleNo,
                sampleCode: "",
                status: "expected",
                receivedAt: null,
                collectedAt: null,
                barcode: "",
                storageLocation: "",
                conditionNotes: "",
                notes: "",
                verifiedById: null,
                approvedById: null,
                rejectReason: null,
                createdAt: nowIso(),
              },
            ],
          },
          input.jobId,
        );
        await refresh();
        return { ok: true };
      });
      return id;
    },
    [data, refresh, withClient],
  );

  const receiveSample: LimsContextValue["receiveSample"] = useCallback(
    (id, receivedAt, conditionNotes) =>
      withClient(async (client) => {
        await updateRow(client, "samples", id, [
          { received_at: receivedAt, receive_notes: conditionNotes },
        ]);
        const res = await transitionSample(client, id, "received");
        const sample = data.samples.find((s) => s.id === id);
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const updateSampleFields: LimsContextValue["updateSampleFields"] = useCallback(
    (id, fields) =>
      withClient(async (client) => {
        const sample = data.samples.find((s) => s.id === id);
        if (!sample) return fail("Sampel tidak ditemukan.");
        if (!canFreeEditSample(sample.status, "admin")) {
          return fail("Field kritis terkunci setelah pengujian dimulai. Hanya aksi status.");
        }
        await updateRow(client, "samples", id, sampleFieldPayloads(fields));
        await refresh();
        return { ok: true };
      }),
    [data.samples, refresh, withClient],
  );

  const archiveSample: LimsContextValue["archiveSample"] = useCallback(
    (id, actor, reason) =>
      withClient(async (client) => {
        if (!["admin", "sampler", "analyst"].includes(actor.role)) {
          return fail("Peran ini tidak boleh mengarsipkan sampel.");
        }
        const sample = data.samples.find((s) => s.id === id);
        if (!sample) return fail("Sampel tidak ditemukan.");
        if (!SAMPLE_ARCHIVE_STATUSES.includes(sample.status)) {
          return fail("Arsip hanya dari Diharapkan atau Diterima. Hapus keras dilarang.");
        }
        const res = await transitionSample(client, id, "archived", {
          reason: reason?.trim() || "Arsip sampel",
        });
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const startTesting: LimsContextValue["startTesting"] = useCallback(
    (sampleId) =>
      withClient(async (client) => {
        const sample = data.samples.find((s) => s.id === sampleId);
        if (!sample) return fail("Sampel tidak ditemukan.");
        const to = submitTarget(sample.status);
        if (sample.status !== "received" || to !== "in_testing") {
          return fail("Kirim ke pengujian hanya dari status Diterima.");
        }
        const res = await transitionSample(client, sampleId, "in_testing");
        await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const saveResults: LimsContextValue["saveResults"] = useCallback(
    (sampleId, rows, analystId) =>
      withClient(async (client) => {
        const filled = rows.filter((r) => r.parameterId && r.result.trim());
        if (!filled.length) return fail("Minimal satu baris parameter dengan hasil.");
        await deleteWhere(client, "results", "sample_id", sampleId);
        for (const row of filled) {
          await insertRow(client, "results", [
            {
              sample_id: sampleId,
              parameter_id: row.parameterId,
              method_id: row.methodId,
              unit: row.unitId,
              satuan: row.unitId,
              result: row.result,
              value: row.result,
              analyst_id: analystId,
              tested_at: row.testedAt || nowIso(),
            },
          ]);
        }
        const sample = data.samples.find((s) => s.id === sampleId);
        let res: ActionResult = { ok: true };
        if (sample?.status === "received") {
          res = await transitionSample(client, sampleId, "in_testing");
        }
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const submitForVerify: LimsContextValue["submitForVerify"] = useCallback(
    (sampleId) =>
      withClient(async (client) => {
        const sample = data.samples.find((s) => s.id === sampleId);
        if (!sample) return fail("Sampel tidak ditemukan.");
        const to = submitTarget(sample.status);
        if (to !== "pending_verify") {
          return fail("Kirim verifikasi dari status Pengujian atau Ditolak.");
        }
        const res = await transitionSample(client, sampleId, "pending_verify");
        await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const verifySample: LimsContextValue["verifySample"] = useCallback(
    (sampleId, actor) =>
      withClient(async (client) => {
        if (actor.role !== "verifier" && actor.role !== "admin") {
          return fail("Hanya Verifier atau Admin yang boleh memverifikasi.");
        }
        await updateRow(client, "samples", sampleId, [{ verified_by: actor.id }]);
        const res = await transitionSample(client, sampleId, "pending_approve");
        const sample = data.samples.find((s) => s.id === sampleId);
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const approveSample: LimsContextValue["approveSample"] = useCallback(
    (sampleId, actor, override = false) =>
      withClient(async (client) => {
        if (actor.role !== "approver" && actor.role !== "admin") {
          return fail("Hanya Approver atau Admin yang boleh approve.");
        }
        const sample = data.samples.find((s) => s.id === sampleId);
        const adminOverride = Boolean(override && actor.role === "admin");
        if (sample?.verifiedById && sample.verifiedById === actor.id && !adminOverride) {
          return fail(
            "Dual control: Verify dan Approve harus dua pengguna berbeda. Admin dapat override.",
          );
        }
        await updateRow(client, "samples", sampleId, [{ approved_by: actor.id }]);
        const res = await transitionSample(client, sampleId, "approved", {
          override: adminOverride,
          reason: adminOverride ? "Admin override dual control" : null,
        });
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const rejectSample: LimsContextValue["rejectSample"] = useCallback(
    (sampleId, _actor, reason) =>
      withClient(async (client) => {
        if (!reason.trim()) return fail("Alasan penolakan wajib diisi.");
        const res = await transitionSample(client, sampleId, "rejected", { reason: reason.trim() });
        const sample = data.samples.find((s) => s.id === sampleId);
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const issueLhu: LimsContextValue["issueLhu"] = useCallback(
    (jobId, actor) =>
      withClient(async (client) => {
        const lhuNo = nextLhuNo(data.lhuRecords.map((l) => l.lhuNo));
        const inserted = await insertRow(client, "lhu", [
          {
            job_id: jobId,
            status: "draft",
            revision: 0,
            issuer_id: actor.id,
            lhu_number: lhuNo,
            lhu_no: lhuNo,
          },
        ]);
        const lhuId = (inserted.row?.id as string | undefined) ?? "";
        if (!lhuId) return fail("LHU draft tidak punya id.");
        const issued = await transitionLhu(client, lhuId, "issued", { lhuNumber: lhuNo });
        await transitionJob(client, jobId, "lhu_issued");
        await refresh();
        return issued;
      }),
    [data.lhuRecords, refresh, withClient],
  );

  const createInvoice: LimsContextValue["createInvoice"] = useCallback(
    (jobId, amount) =>
      withClient(async (client) => {
        if (!Number.isFinite(amount) || amount <= 0) return fail("Nominal invoice harus lebih dari 0.");
        const invoiceNo = nextInvoiceNo(data.invoices.map((i) => i.invoiceNo));
        await insertRow(client, "invoices", [
          {
            invoice_no: invoiceNo,
            job_id: jobId,
            amount,
            status: "unpaid",
          },
        ]);
        await transitionJob(client, jobId, "invoiced");
        await refresh();
        return { ok: true };
      }),
    [data.invoices, refresh, withClient],
  );

  const markInvoice: LimsContextValue["markInvoice"] = useCallback(
    (id, status: Invoice["status"]) =>
      withClient(async (client) => {
        const res = await transitionInvoice(client, id, status);
        await refresh();
        return res;
      }),
    [refresh, withClient],
  );

  const saveMaster: LimsContextValue["saveMaster"] = useCallback(
    (kind, item) =>
      withClient(async (client) => {
        const payload = masterPayload(kind, item);
        if (item.id) {
          await updateRow(client, kind, item.id, [payload]);
        } else {
          await insertRow(client, kind, [payload]);
        }
        await refresh();
        return { ok: true };
      }),
    [refresh, withClient],
  );

  const setMasterActive: LimsContextValue["setMasterActive"] = useCallback(
    (kind, id, isActive) =>
      withClient(async (client) => {
        await updateRow(client, kind, id, [{ is_active: isActive }]);
        await refresh();
        return { ok: true };
      }),
    [refresh, withClient],
  );

  const value = useMemo<LimsContextValue>(
    () => ({
      data,
      mode,
      isLoading,
      loadError,
      refresh,
      resetDemo: () => undefined,
      upsertCustomer,
      upsertSite,
      createJob,
      scheduleJob,
      createSampling,
      markSamplingDone,
      createSample,
      receiveSample,
      updateSampleFields,
      archiveSample,
      startTesting,
      saveResults,
      submitForVerify,
      verifySample,
      approveSample,
      rejectSample,
      issueLhu,
      createInvoice,
      markInvoice,
      saveMaster,
      setMasterActive,
    }),
    [
      data,
      mode,
      isLoading,
      loadError,
      refresh,
      upsertCustomer,
      upsertSite,
      createJob,
      scheduleJob,
      createSampling,
      markSamplingDone,
      createSample,
      receiveSample,
      updateSampleFields,
      archiveSample,
      startTesting,
      saveResults,
      submitForVerify,
      verifySample,
      approveSample,
      rejectSample,
      issueLhu,
      createInvoice,
      markInvoice,
      saveMaster,
      setMasterActive,
    ],
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

export type { SamplingEvent };
