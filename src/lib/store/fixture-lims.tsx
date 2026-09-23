"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { nextInvoiceNo, nextJobNo, nextLhuNo, nextSampleNo, nowIso, uid } from "@/lib/domain/ids";
import type {
  Customer,
  CustomerSite,
  Invoice,
  Job,
  LhuRecord,
  LimsData,
  Method,
  Parameter,
  SampleFreeFields,
  SamplingEvent,
  TestResult,
  Unit,
} from "@/lib/domain/types";
import type { SessionUser } from "@/lib/auth/types";
import { SEED_DATA } from "@/lib/fixtures/seed";
import { canFreeEditSample, SAMPLE_ARCHIVE_STATUSES } from "@/lib/status/sample-gate";
import { withSyncedJob } from "@/lib/store/sync-job";
import { LimsContext, type ActionResult, type LimsContextValue } from "@/lib/store/context";

const STORAGE_KEY = "pcs-lims-data-v3";

function loadData(): LimsData {
  if (typeof window === "undefined") return SEED_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SEED_DATA);
    const parsed = JSON.parse(raw) as LimsData;
    if (parsed.version !== 2 && parsed.version !== 3) return structuredClone(SEED_DATA);
    return parsed;
  } catch {
    return structuredClone(SEED_DATA);
  }
}

export function FixtureLimsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LimsData>(SEED_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const resetDemo = useCallback(() => {
    const next = structuredClone(SEED_DATA);
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const upsertCustomer = useCallback((input: Omit<Customer, "id"> & { id?: string }) => {
    const id = input.id ?? uid("c");
    setData((prev) => {
      const exists = prev.customers.some((c) => c.id === id);
      const row = { ...input, id };
      return {
        ...prev,
        customers: exists
          ? prev.customers.map((c) => (c.id === id ? row : c))
          : [...prev.customers, row],
      };
    });
    return id;
  }, []);

  const upsertSite = useCallback((input: Omit<CustomerSite, "id"> & { id?: string }) => {
    const id = input.id ?? uid("site");
    setData((prev) => {
      const exists = prev.sites.some((s) => s.id === id);
      const row = { ...input, id };
      return {
        ...prev,
        sites: exists ? prev.sites.map((s) => (s.id === id ? row : s)) : [...prev.sites, row],
      };
    });
    return id;
  }, []);

  const createJob = useCallback((input: Omit<Job, "id" | "jobNo" | "status" | "createdAt">) => {
    const id = uid("j");
    setData((prev) => ({
      ...prev,
      jobs: [
        ...prev.jobs,
        {
          ...input,
          id,
          jobNo: nextJobNo(prev.jobs.map((j) => j.jobNo)),
          status: "draft",
          createdAt: nowIso(),
        },
      ],
    }));
    return id;
  }, []);

  const scheduleJob = useCallback((jobId: string): ActionResult => {
    setData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) =>
        j.id === jobId && j.status === "draft" ? { ...j, status: "scheduled" } : j,
      ),
    }));
    return { ok: true };
  }, []);

  const createSampling = useCallback((input: Omit<SamplingEvent, "id" | "status">) => {
    const id = uid("se");
    setData((prev) => {
      const next: LimsData = {
        ...prev,
        samplingEvents: [...prev.samplingEvents, { ...input, id, status: "scheduled" }],
        jobs: prev.jobs.map((j) =>
          j.id === input.jobId && (j.status === "draft" || j.status === "scheduled")
            ? { ...j, status: "sampling" }
            : j,
        ),
      };
      return withSyncedJob(next, input.jobId);
    });
    return id;
  }, []);

  const markSamplingDone = useCallback((id: string) => {
    setData((prev) => {
      const ev = prev.samplingEvents.find((e) => e.id === id);
      if (!ev) return prev;
      const next = {
        ...prev,
        samplingEvents: prev.samplingEvents.map((e) =>
          e.id === id ? { ...e, status: "done" as const } : e,
        ),
      };
      return withSyncedJob(next, ev.jobId);
    });
  }, []);

  const createSample = useCallback((input: { jobId: string; matrixId: string }) => {
    const id = uid("sm");
    setData((prev) => {
      const next: LimsData = {
        ...prev,
        samples: [
          ...prev.samples,
          {
            id,
            sampleNo: nextSampleNo(prev.samples.map((s) => s.sampleNo)),
            sampleCode: "",
            jobId: input.jobId,
            matrixId: input.matrixId,
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
      };
      return withSyncedJob(next, input.jobId);
    });
    return id;
  }, []);

  const receiveSample = useCallback(
    (id: string, receivedAt: string, conditionNotes: string): ActionResult => {
      let message = "";
      setData((prev) => {
        const sample = prev.samples.find((s) => s.id === id);
        if (!sample) {
          message = "Sampel tidak ditemukan.";
          return prev;
        }
        if (sample.status !== "expected" && sample.status !== "received") {
          message = "Sampel ini sudah diproses lebih lanjut.";
          return prev;
        }
        const next: LimsData = {
          ...prev,
          samples: prev.samples.map((s) =>
            s.id === id
              ? { ...s, status: "received", receivedAt, conditionNotes }
              : s,
          ),
        };
        return withSyncedJob(next, sample.jobId);
      });
      return message ? { ok: false, message } : { ok: true };
    },
    [],
  );

  const updateSampleFields = useCallback((id: string, fields: SampleFreeFields): ActionResult => {
    let message = "";
    setData((prev) => {
      const sample = prev.samples.find((s) => s.id === id);
      if (!sample) {
        message = "Sampel tidak ditemukan.";
        return prev;
      }
      if (!canFreeEditSample(sample.status, "admin")) {
        message = "Field kritis terkunci setelah pengujian dimulai.";
        return prev;
      }
      return {
        ...prev,
        samples: prev.samples.map((s) =>
          s.id === id
            ? {
                ...s,
                matrixId: fields.matrixId,
                sampleCode: fields.sampleCode,
                conditionNotes: fields.receiveNotes,
                notes: fields.notes,
                barcode: fields.barcode,
                storageLocation: fields.storageLocation,
                collectedAt: fields.collectedAt,
              }
            : s,
        ),
      };
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const archiveSample = useCallback((id: string, actor: SessionUser, reason?: string): ActionResult => {
    if (!["admin", "sampler", "analyst"].includes(actor.role)) {
      return { ok: false, message: "Peran ini tidak boleh mengarsipkan sampel." };
    }
    let message = "";
    setData((prev) => {
      const sample = prev.samples.find((s) => s.id === id);
      if (!sample) {
        message = "Sampel tidak ditemukan.";
        return prev;
      }
      if (!SAMPLE_ARCHIVE_STATUSES.includes(sample.status)) {
        message = "Arsip hanya dari Diharapkan atau Diterima. Hapus keras dilarang.";
        return prev;
      }
      const next: LimsData = {
        ...prev,
        samples: prev.samples.map((s) => (s.id === id ? { ...s, status: "archived" as const } : s)),
        auditLogs: [
          ...prev.auditLogs,
          {
            id: uid("aud"),
            actorId: actor.id,
            entityType: "sample",
            entityId: id,
            fromStatus: sample.status,
            toStatus: "archived",
            override: false,
            reason: reason?.trim() || "Arsip sampel",
            createdAt: nowIso(),
          },
        ],
      };
      return withSyncedJob(next, sample.jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const startTesting = useCallback((sampleId: string): ActionResult => {
    let message = "";
    setData((prev) => {
      const sample = prev.samples.find((s) => s.id === sampleId);
      if (!sample) {
        message = "Sampel tidak ditemukan.";
        return prev;
      }
      if (sample.status !== "received") {
        message = "Kirim ke pengujian hanya dari status Diterima.";
        return prev;
      }
      const next: LimsData = {
        ...prev,
        samples: prev.samples.map((s) =>
          s.id === sampleId ? { ...s, status: "in_testing" as const } : s,
        ),
      };
      return withSyncedJob(next, sample.jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const saveResults = useCallback(
    (sampleId: string, rows: Omit<TestResult, "id" | "sampleId">[], analystId: string): ActionResult => {
      let message = "";
      setData((prev) => {
        const sample = prev.samples.find((s) => s.id === sampleId);
        if (!sample) {
          message = "Sampel tidak ditemukan.";
          return prev;
        }
        if (!["received", "in_testing", "rejected"].includes(sample.status)) {
          message = "Hasil hanya bisa diisi saat sampel diterima, diuji, atau ditolak.";
          return prev;
        }
        const filled = rows.filter((r) => r.parameterId && r.result.trim());
        if (filled.length === 0) {
          message = "Minimal satu baris parameter dengan hasil.";
          return prev;
        }
        const next: LimsData = {
          ...prev,
          results: [
            ...prev.results.filter((r) => r.sampleId !== sampleId),
            ...filled.map((r) => ({
              ...r,
              id: uid("r"),
              sampleId,
              analystId,
              testedAt: r.testedAt || nowIso(),
            })),
          ],
          samples: prev.samples.map((s) =>
            s.id === sampleId
              ? {
                  ...s,
                  status: "in_testing" as const,
                  verifiedById: null,
                  approvedById: null,
                  rejectReason: null,
                }
              : s,
          ),
        };
        return withSyncedJob(next, sample.jobId);
      });
      return message ? { ok: false, message } : { ok: true };
    },
    [],
  );

  const submitForVerify = useCallback((sampleId: string): ActionResult => {
    let message = "";
    setData((prev) => {
      const sample = prev.samples.find((s) => s.id === sampleId);
      const rows = prev.results.filter((r) => r.sampleId === sampleId);
      if (!sample) {
        message = "Sampel tidak ditemukan.";
        return prev;
      }
      if (sample.status !== "in_testing" && sample.status !== "rejected") {
        message = "Kirim verifikasi dari status pengujian.";
        return prev;
      }
      if (rows.length === 0) {
        message = "Isi hasil uji terlebih dahulu.";
        return prev;
      }
      const next: LimsData = {
        ...prev,
        samples: prev.samples.map((s) =>
          s.id === sampleId
            ? { ...s, status: "pending_verify", verifiedById: null, approvedById: null }
            : s,
        ),
      };
      return withSyncedJob(next, sample.jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const verifySample = useCallback((sampleId: string, actor: SessionUser): ActionResult => {
    if (actor.role !== "verifier" && actor.role !== "admin") {
      return { ok: false, message: "Hanya Verifier atau Admin yang boleh memverifikasi." };
    }
    let message = "";
    setData((prev) => {
      const sample = prev.samples.find((s) => s.id === sampleId);
      if (!sample || sample.status !== "pending_verify") {
        message = "Sampel tidak dalam antrean verifikasi.";
        return prev;
      }
      const next: LimsData = {
        ...prev,
        samples: prev.samples.map((s) =>
          s.id === sampleId
            ? { ...s, status: "pending_approve", verifiedById: actor.id, rejectReason: null }
            : s,
        ),
        auditLogs: [
          ...prev.auditLogs,
          {
            id: uid("aud"),
            actorId: actor.id,
            entityType: "sample",
            entityId: sampleId,
            fromStatus: "pending_verify",
            toStatus: "pending_approve",
            override: false,
            reason: null,
            createdAt: nowIso(),
          },
        ],
      };
      return withSyncedJob(next, sample.jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const approveSample = useCallback(
    (sampleId: string, actor: SessionUser, override = false): ActionResult => {
      const canApprove = actor.role === "approver" || actor.role === "admin";
      if (!canApprove) {
        return { ok: false, message: "Hanya Approver atau Admin yang boleh approve." };
      }
      let message = "";
      setData((prev) => {
        const sample = prev.samples.find((s) => s.id === sampleId);
        if (!sample) {
          message = "Sampel tidak ditemukan.";
          return prev;
        }
        const skipVerify = override && actor.role === "admin" && sample.status === "pending_verify";
        if (sample.status !== "pending_approve" && !skipVerify) {
          message = "Approve hanya setelah verifikasi (kecuali override Admin).";
          return prev;
        }
        if (sample.verifiedById && sample.verifiedById === actor.id && !override) {
          message =
            "Dual control: Verify dan Approve harus dua pengguna berbeda. Admin dapat override.";
          return prev;
        }
        if (!sample.verifiedById && !skipVerify) {
          message = "Belum diverifikasi.";
          return prev;
        }
        const from = sample.status;
        const next: LimsData = {
          ...prev,
          samples: prev.samples.map((s) =>
            s.id === sampleId
              ? { ...s, status: "approved", approvedById: actor.id, rejectReason: null }
              : s,
          ),
          auditLogs: [
            ...prev.auditLogs,
            {
              id: uid("aud"),
              actorId: actor.id,
              entityType: "sample",
              entityId: sampleId,
              fromStatus: from,
              toStatus: "approved",
              override: Boolean(skipVerify || override),
              reason: skipVerify || override ? "Admin override dual control" : null,
              createdAt: nowIso(),
            },
          ],
        };
        return withSyncedJob(next, sample.jobId);
      });
      return message ? { ok: false, message } : { ok: true };
    },
    [],
  );

  const rejectSample = useCallback(
    (sampleId: string, actor: SessionUser, reason: string): ActionResult => {
      if (!reason.trim()) return { ok: false, message: "Alasan penolakan wajib diisi." };
      if (!["verifier", "approver", "admin"].includes(actor.role)) {
        return { ok: false, message: "Peran ini tidak boleh menolak hasil." };
      }
      let message = "";
      setData((prev) => {
        const sample = prev.samples.find((s) => s.id === sampleId);
        if (!sample || !["pending_verify", "pending_approve"].includes(sample.status)) {
          message = "Sampel tidak dalam antrean review.";
          return prev;
        }
        const next: LimsData = {
          ...prev,
          samples: prev.samples.map((s) =>
            s.id === sampleId
              ? {
                  ...s,
                  status: "rejected",
                  rejectReason: reason.trim(),
                  verifiedById: null,
                  approvedById: null,
                }
              : s,
          ),
          auditLogs: [
            ...prev.auditLogs,
            {
              id: uid("aud"),
              actorId: actor.id,
              entityType: "sample",
              entityId: sampleId,
              fromStatus: sample.status,
              toStatus: "rejected",
              override: false,
              reason: reason.trim(),
              createdAt: nowIso(),
            },
          ],
        };
        return withSyncedJob(next, sample.jobId);
      });
      return message ? { ok: false, message } : { ok: true };
    },
    [],
  );

  const issueLhu = useCallback((jobId: string, actor: SessionUser): ActionResult => {
    if (actor.role !== "approver" && actor.role !== "admin") {
      return { ok: false, message: "Hanya Approver atau Admin yang menerbitkan LHU." };
    }
    let message = "";
    setData((prev) => {
      const job = prev.jobs.find((j) => j.id === jobId);
      if (!job) {
        message = "Job tidak ditemukan.";
        return prev;
      }
      const samples = prev.samples.filter((s) => s.jobId === jobId && s.status !== "archived");
      const ready =
        job.status === "lhu_ready" ||
        (samples.length > 0 && samples.every((s) => s.status === "approved" || s.status === "archived"));
      if (!ready) {
        message = "Semua sampel aktif harus disetujui sebelum LHU diterbitkan.";
        return prev;
      }
      const record: LhuRecord = {
        id: uid("lhu"),
        lhuNo: nextLhuNo(prev.lhuRecords.map((l) => l.lhuNo)),
        jobId,
        revision: 0,
        issuerId: actor.id,
        issuedAt: nowIso(),
        status: "issued",
      };
      const next: LimsData = {
        ...prev,
        lhuRecords: [...prev.lhuRecords, record],
        auditLogs: [
          ...prev.auditLogs,
          {
            id: uid("aud"),
            actorId: actor.id,
            entityType: "lhu",
            entityId: record.id,
            fromStatus: "draft",
            toStatus: "issued",
            override: false,
            reason: null,
            createdAt: nowIso(),
          },
        ],
      };
      return withSyncedJob(next, jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const createInvoice = useCallback((jobId: string, amount: number): ActionResult => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, message: "Nominal invoice harus lebih dari 0." };
    }
    let message = "";
    setData((prev) => {
      const job = prev.jobs.find((j) => j.id === jobId);
      if (!job) {
        message = "Job tidak ditemukan.";
        return prev;
      }
      if (job.status !== "lhu_issued") {
        message = "Invoice stub hanya setelah LHU terbit.";
        return prev;
      }
      if (prev.invoices.some((i) => i.jobId === jobId && i.status !== "void")) {
        message = "Job ini sudah punya invoice aktif.";
        return prev;
      }
      const invoice: Invoice = {
        id: uid("inv"),
        invoiceNo: nextInvoiceNo(prev.invoices.map((i) => i.invoiceNo)),
        jobId,
        amount,
        status: "unpaid",
        createdAt: nowIso(),
      };
      const next: LimsData = {
        ...prev,
        invoices: [...prev.invoices, invoice],
      };
      return withSyncedJob(next, jobId);
    });
    return message ? { ok: false, message } : { ok: true };
  }, []);

  const markInvoice = useCallback((id: string, status: Invoice["status"]): ActionResult => {
    setData((prev) => {
      const inv = prev.invoices.find((i) => i.id === id);
      if (!inv) return prev;
      const next = {
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === id ? { ...i, status } : i)),
      };
      return withSyncedJob(next, inv.jobId);
    });
    return { ok: true };
  }, []);

  const upsertMaster = useCallback(
    (kind: "matrices" | "parameters" | "methods" | "units", item: { id?: string; name: string }) => {
      setData((prev) => {
        const list = prev[kind] as Array<MatrixLike>;
        const id = item.id ?? uid(kind.slice(0, 2));
        const row = { id, name: item.name };
        const exists = list.some((x) => x.id === id);
        return {
          ...prev,
          [kind]: exists ? list.map((x) => (x.id === id ? row : x)) : [...list, row],
        };
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      data,
      mode: "fixtures" as const,
      isLoading: false,
      loadError: null,
      refresh: async () => undefined,
      resetDemo,
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
      upsertMaster,
    }),
    [
      data,
      resetDemo,
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
      upsertMaster,
    ],
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

type MatrixLike = Parameter | Method | Unit | { id: string; name: string };
