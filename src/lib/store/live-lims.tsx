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
import type { Invoice, LimsData, SamplingEvent } from "@/lib/domain/types";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deriveJobStatus } from "@/lib/store/sync-job";
import { LimsContext, type ActionResult, type LimsContextValue } from "@/lib/store/context";
import type { RuntimeMode } from "@/lib/config/runtime";

function fail(message: string): ActionResult {
  return { ok: false, message };
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
            job_no: jobNo,
            customer_id: input.customerId,
            site_id: input.siteId,
            matrix_id: input.matrixId,
            due_date: input.dueDate,
            scope: input.scope,
            status: "draft",
          },
          {
            job_no: jobNo,
            customer_id: input.customerId,
            site_id: input.siteId,
            matrix_id: input.matrixId,
            due_date: input.dueDate,
            scope: input.scope,
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
            sample_no: sampleNo,
            job_id: input.jobId,
            matrix_id: input.matrixId,
            status: "expected",
          },
          {
            sample_no: sampleNo,
            job_id: input.jobId,
            matrix_id: input.matrixId,
            status: "expected",
          },
        ]);
        await syncJob(client, { ...data, samples: [...data.samples, { ...input, id, sampleNo, status: "expected", receivedAt: null, conditionNotes: "", verifiedById: null, approvedById: null, rejectReason: null, createdAt: nowIso() }] }, input.jobId);
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
          { received_at: receivedAt, condition_notes: conditionNotes, receive_notes: conditionNotes },
        ]);
        const res = await transitionSample(client, id, "received");
        const sample = data.samples.find((s) => s.id === id);
        if (sample) await syncJob(client, data, sample.jobId);
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
              unit_id: row.unitId,
              unit: row.unitId,
              result: row.result,
              value: row.result,
              analyst_id: analystId,
              tested_at: row.testedAt || nowIso(),
            },
          ]);
        }
        const res = await transitionSample(client, sampleId, "in_testing");
        const sample = data.samples.find((s) => s.id === sampleId);
        if (sample) await syncJob(client, data, sample.jobId);
        await refresh();
        return res;
      }),
    [data, refresh, withClient],
  );

  const submitForVerify: LimsContextValue["submitForVerify"] = useCallback(
    (sampleId) =>
      withClient(async (client) => {
        const res = await transitionSample(client, sampleId, "pending_verify");
        const sample = data.samples.find((s) => s.id === sampleId);
        if (sample) await syncJob(client, data, sample.jobId);
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
        await updateRow(client, "samples", sampleId, [
          { verified_by: actor.id },
          { verified_by_id: actor.id },
          { verifier_id: actor.id },
        ]);
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
        await updateRow(client, "samples", sampleId, [
          { approved_by: actor.id },
          { approved_by_id: actor.id },
          { approver_id: actor.id },
        ]);
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
        await updateRow(client, "samples", sampleId, [
          { reject_reason: reason.trim(), rejection_reason: reason.trim() },
        ]);
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

  const upsertMaster: LimsContextValue["upsertMaster"] = useCallback(
    (kind, item) => {
      if (kind === "units") return;
      const key =
        kind === "matrices" ? "matrices" : kind === "parameters" ? "parameters" : "methods";
      void withClient(async (client) => {
        await insertRow(client, key, [{ name: item.name }]);
        await refresh();
        return { ok: true };
      });
    },
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
      saveResults,
      submitForVerify,
      verifySample,
      approveSample,
      rejectSample,
      issueLhu,
      createInvoice,
      markInvoice,
      upsertMaster,
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
      saveResults,
      submitForVerify,
      verifySample,
      approveSample,
      rejectSample,
      issueLhu,
      createInvoice,
      markInvoice,
      upsertMaster,
    ],
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

export type { SamplingEvent };
