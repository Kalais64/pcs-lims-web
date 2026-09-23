import { createContext, useContext } from "react";
import type { RuntimeMode } from "@/lib/config/runtime";
import type {
  Customer,
  CustomerSite,
  Invoice,
  Job,
  JobFreeFields,
  LimsData,
  Matrix,
  Method,
  Parameter,
  SampleFreeFields,
  SamplingEvent,
  TestResult,
} from "@/lib/domain/types";
import type { SessionUser } from "@/lib/auth/types";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type LimsContextValue = {
  data: LimsData;
  mode: RuntimeMode;
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  resetDemo: () => void;
  upsertCustomer: (input: Omit<Customer, "id"> & { id?: string }) => string;
  upsertSite: (input: Omit<CustomerSite, "id"> & { id?: string }) => string;
  createJob: (input: Omit<Job, "id" | "jobNo" | "status" | "createdAt">) => string;
  scheduleJob: (jobId: string) => ActionResult | Promise<ActionResult>;
  updateJobFields: (id: string, fields: JobFreeFields, actor: SessionUser) => ActionResult | Promise<ActionResult>;
  transitionJobStatus: (
    id: string,
    toStatus: string,
    actor: SessionUser,
    extra?: { reason?: string | null; override?: boolean },
  ) => ActionResult | Promise<ActionResult>;
  createSampling: (input: Omit<SamplingEvent, "id" | "status">) => string;
  markSamplingDone: (id: string) => void;
  createSample: (input: { jobId: string; matrixId: string }) => string;
  receiveSample: (id: string, receivedAt: string, conditionNotes: string) => ActionResult | Promise<ActionResult>;
  updateSampleFields: (id: string, fields: SampleFreeFields) => ActionResult | Promise<ActionResult>;
  archiveSample: (id: string, actor: SessionUser, reason?: string) => ActionResult | Promise<ActionResult>;
  startTesting: (sampleId: string) => ActionResult | Promise<ActionResult>;
  saveResults: (
    sampleId: string,
    rows: Omit<TestResult, "id" | "sampleId">[],
    analystId: string,
  ) => ActionResult | Promise<ActionResult>;
  submitForVerify: (sampleId: string) => ActionResult | Promise<ActionResult>;
  verifySample: (sampleId: string, actor: SessionUser) => ActionResult | Promise<ActionResult>;
  approveSample: (
    sampleId: string,
    actor: SessionUser,
    override?: boolean,
  ) => ActionResult | Promise<ActionResult>;
  rejectSample: (sampleId: string, actor: SessionUser, reason: string) => ActionResult | Promise<ActionResult>;
  issueLhu: (jobId: string, actor: SessionUser) => ActionResult | Promise<ActionResult>;
  createInvoice: (jobId: string, amount: number) => ActionResult | Promise<ActionResult>;
  markInvoice: (id: string, status: Invoice["status"]) => ActionResult | Promise<ActionResult>;
  saveMaster: (
    kind: MasterKind,
    item: MasterInput,
    actorId?: string,
  ) => ActionResult | Promise<ActionResult>;
  setMasterActive: (
    kind: MasterKind,
    id: string,
    isActive: boolean,
    actorId?: string,
  ) => ActionResult | Promise<ActionResult>;
};

export const LimsContext = createContext<LimsContextValue | null>(null);

export function useLims() {
  const ctx = useContext(LimsContext);
  if (!ctx) throw new Error("useLims harus di dalam LimsProvider");
  return ctx;
}

export function staffName(data: LimsData, id: string | null) {
  if (!id) return "—";
  return data.profiles.find((p) => p.id === id)?.name ?? id;
}

export type MasterKind = "matrices" | "parameters" | "methods";

export type MasterInput = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  standardRef?: string;
  unit?: string;
  methodId?: string;
  matrixId?: string;
  loq?: string;
  bakuMutu?: string;
  isActive?: boolean;
};

export type MasterRow = Matrix | Parameter | Method;
