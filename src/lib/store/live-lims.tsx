"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_DATA } from "@/lib/data/empty";
import { loadLiveData } from "@/lib/data/load-live";
import { insertRow, updateRow, deleteWhere } from "@/lib/data/tables";
import { omitEmptyUuidFields, uuidOrNull } from "@/lib/data/uuid";
import {
  transitionInvoice,
  transitionJob,
  transitionLhu,
  transitionSample,
} from "@/lib/data/rpc";
import { nextCustomerCode, nextInvoiceNo, nextJobNo, nextLhuNo, nextSampleNo, nowIso } from "@/lib/domain/ids";
import type {
  ContactDraft,
  Invoice,
  LimsData,
  SampleFreeFields,
  SamplingEvent,
  SiteDraft,
} from "@/lib/domain/types";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deriveJobStatus } from "@/lib/store/sync-job";
import { LimsContext, type ActionResult, type LimsContextValue, type MasterInput, type MasterKind } from "@/lib/store/context";
import type { RuntimeMode } from "@/lib/config/runtime";
import {
  canChangeJobCustomer,
  canEditJobDueOrScope,
  canEditJobSite,
  canFreeEditJob,
  isSamplingOrLater,
  isValidDueDate,
  jobActionsFor,
} from "@/lib/status/job-gate";
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

  const createCustomer: LimsContextValue["createCustomer"] = useCallback(
    (input) =>
      withClient(async (client) => {
        const name = input.name.trim();
        if (!name) return fail("Nama perusahaan wajib diisi.");
        const code = (input.code?.trim() || nextCustomerCode(data.customers.map((c) => c.code))).toUpperCase();
        if (data.customers.some((c) => c.code.toUpperCase() === code)) {
          return fail("Kode customer sudah dipakai.");
        }
        const inserted = await insertRow(client, "customers", [
          {
            code,
            name,
            npwp: input.npwp?.trim() || null,
            billing_address: input.billingAddress?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            notes: input.notes?.trim() || null,
            is_active: true,
          },
        ]);
        const id = inserted.row?.id as string | undefined;
        await refresh();
        return { ok: true, id };
      }),
    [data.customers, refresh, withClient],
  );

  const updateCustomer: LimsContextValue["updateCustomer"] = useCallback(
    (id, input) =>
      withClient(async (client) => {
        const current = data.customers.find((c) => c.id === id);
        if (!current) return fail("Customer tidak ditemukan.");
        if (!current.isActive) return fail("Customer nonaktif hanya bisa diaktifkan kembali.");
        const name = input.name.trim();
        if (!name) return fail("Nama perusahaan wajib diisi.");
        await updateRow(client, "customers", id, [
          {
            name,
            npwp: input.npwp?.trim() || null,
            billing_address: input.billingAddress?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            notes: input.notes?.trim() || null,
          },
        ]);
        await refresh();
        return { ok: true, id };
      }),
    [data.customers, refresh, withClient],
  );

  const setCustomerActive: LimsContextValue["setCustomerActive"] = useCallback(
    (id, isActive) =>
      withClient(async (client) => {
        if (!data.customers.some((c) => c.id === id)) return fail("Customer tidak ditemukan.");
        await updateRow(client, "customers", id, [{ is_active: isActive }]);
        await refresh();
        return { ok: true, id };
      }),
    [data.customers, refresh, withClient],
  );

  const saveSite: LimsContextValue["saveSite"] = useCallback(
    (input: SiteDraft) =>
      withClient(async (client) => {
        const customerId = uuidOrNull(input.customerId);
        if (!customerId) return fail("Site wajib terkait customer.");
        const name = input.name.trim();
        if (!name) return fail("Nama site wajib diisi.");
        const payload = {
          customer_id: customerId,
          name,
          address: input.address?.trim() || null,
          city: input.city?.trim() || null,
          province: input.province?.trim() || null,
          latitude: optionalNumber(input.latitude),
          longitude: optionalNumber(input.longitude),
        };
        if (input.id) {
          await updateRow(client, "sites", input.id, [payload]);
          await refresh();
          return { ok: true, id: input.id };
        }
        const inserted = await insertRow(client, "sites", [payload]);
        await refresh();
        return { ok: true, id: inserted.row?.id as string | undefined };
      }),
    [refresh, withClient],
  );

  const saveContact: LimsContextValue["saveContact"] = useCallback(
    (input: ContactDraft) =>
      withClient(async (client) => {
        const customerId = uuidOrNull(input.customerId);
        if (!customerId) return fail("Kontak wajib terkait customer.");
        const fullName = input.fullName.trim();
        if (!fullName) return fail("Nama kontak wajib diisi.");
        const payload = {
          customer_id: customerId,
          full_name: fullName,
          title: input.title?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          is_primary: Boolean(input.isPrimary),
        };
        let id = input.id;
        if (id) {
          await updateRow(client, "contacts", id, [payload]);
        } else {
          const inserted = await insertRow(client, "contacts", [payload]);
          id = inserted.row?.id as string | undefined;
        }
        if (input.isPrimary && id) {
          const others = data.contacts.filter(
            (row) => row.customerId === customerId && row.id !== id && row.isPrimary,
          );
          for (const other of others) {
            await updateRow(client, "contacts", other.id, [{ is_primary: false }]);
          }
        }
        await refresh();
        return { ok: true, id };
      }),
    [data.contacts, refresh, withClient],
  );

  const createJob: LimsContextValue["createJob"] = useCallback(
    (input) => {
      const id = crypto.randomUUID();
      const jobNo = nextJobNo(data.jobs.map((j) => j.jobNo));
      void withClient(async (client) => {
        await insertRow(client, "jobs", [
          omitEmptyUuidFields({
            id,
            number: jobNo,
            customer_id: input.customerId,
            site_id: uuidOrNull(input.siteId),
            due_date: input.dueDate || null,
            scope_notes: input.scope || null,
          }),
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

  const updateJobFields: LimsContextValue["updateJobFields"] = useCallback(
    (id, fields, actor) =>
      withClient(async (client) => {
        const job = data.jobs.find((j) => j.id === id);
        if (!job) return fail("Job tidak ditemukan.");
        if (!canFreeEditJob(job.status, actor.role) && !canEditJobDueOrScope(job.status, actor.role)) {
          return fail("Field job terkunci untuk peran atau status ini.");
        }
        const dueDate = fields.dueDate ?? job.dueDate;
        if (dueDate && !isValidDueDate(dueDate)) {
          return fail("Due date tidak valid (gunakan tanggal kalender Asia/Jakarta).");
        }
        const payload: Record<string, unknown> = {};
        if (fields.dueDate !== undefined && canEditJobDueOrScope(job.status, actor.role)) {
          payload.due_date = fields.dueDate || null;
        }
        if (fields.scope !== undefined && canEditJobDueOrScope(job.status, actor.role)) {
          payload.scope_notes = fields.scope;
        }
        const siteId = uuidOrNull(fields.siteId);
        if (siteId && canEditJobSite(job.status, actor.role)) {
          payload.site_id = siteId;
        }
        const customerId = uuidOrNull(fields.customerId);
        if (customerId && canChangeJobCustomer(job.status, actor.role)) {
          payload.customer_id = customerId;
        }
        if (Object.keys(payload).length === 0) {
          return fail("Tidak ada field yang boleh diubah pada status ini.");
        }
        await updateRow(client, "jobs", id, [payload]);
        await refresh();
        return { ok: true };
      }),
    [data.jobs, refresh, withClient],
  );

  const transitionJobStatus: LimsContextValue["transitionJobStatus"] = useCallback(
    (id, toStatus, actor, extra) =>
      withClient(async (client) => {
        const job = data.jobs.find((j) => j.id === id);
        if (!job) return fail("Job tidak ditemukan.");
        const legal = jobActionsFor(job, actor).some(
          (action) => action.toStatus === toStatus && action.allowed,
        );
        if (!legal) return fail("Transisi status tidak diizinkan untuk peran ini.");
        if (toStatus === "cancelled" && isSamplingOrLater(job.status) && !extra?.reason?.trim()) {
          return fail("Alasan pembatalan wajib setelah sampling.");
        }
        const res = await transitionJob(client, id, toStatus, {
          reason: extra?.reason ?? null,
          override: extra?.override ?? false,
        });
        await refresh();
        return res;
      }),
    [data.jobs, refresh, withClient],
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
      createCustomer,
      updateCustomer,
      setCustomerActive,
      saveSite,
      saveContact,
      createJob,
      scheduleJob,
      updateJobFields,
      transitionJobStatus,
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
      createCustomer,
      updateCustomer,
      setCustomerActive,
      saveSite,
      saveContact,
      createJob,
      scheduleJob,
      updateJobFields,
      transitionJobStatus,
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
