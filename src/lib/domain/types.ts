import type { Role } from "@/lib/auth/types";
import type { InvoiceStatus } from "@/lib/status/invoice";
import type { JobStatus } from "@/lib/status/job";
import type { LhuStatus } from "@/lib/status/lhu";
import type { SampleStatus } from "@/lib/status/sample";
import type { SamplingStatus } from "@/lib/status/sampling";

export type StaffProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Customer = {
  id: string;
  companyName: string;
  pic: string;
  email: string;
  phone: string;
  address: string;
};

export type CustomerSite = {
  id: string;
  customerId: string;
  name: string;
  address: string;
};

export type Matrix = { id: string; name: string };
export type Parameter = { id: string; name: string; unit?: string };
export type Method = { id: string; name: string };
export type Unit = { id: string; name: string };

export type Job = {
  id: string;
  jobNo: string;
  customerId: string;
  siteId: string;
  matrixId: string;
  dueDate: string;
  scope: string;
  status: JobStatus;
  createdAt: string;
};

export type SamplingEvent = {
  id: string;
  jobId: string;
  siteId: string;
  date: string;
  petugas: string;
  status: SamplingStatus;
};

export type Sample = {
  id: string;
  sampleNo: string;
  sampleCode: string;
  jobId: string;
  matrixId: string;
  status: SampleStatus;
  receivedAt: string | null;
  collectedAt: string | null;
  barcode: string;
  storageLocation: string;
  conditionNotes: string;
  notes: string;
  verifiedById: string | null;
  approvedById: string | null;
  rejectReason: string | null;
  createdAt: string;
};

export type SampleFreeFields = {
  matrixId: string;
  sampleCode: string;
  receiveNotes: string;
  notes: string;
  barcode: string;
  storageLocation: string;
  collectedAt: string | null;
};

export type TestResult = {
  id: string;
  sampleId: string;
  parameterId: string;
  methodId: string;
  unitId: string;
  result: string;
  analystId: string;
  testedAt: string;
};

export type LhuRecord = {
  id: string;
  lhuNo: string;
  jobId: string;
  revision: number;
  issuerId: string;
  issuedAt: string | null;
  status: LhuStatus;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  jobId: string;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  entityType: "job" | "sample" | "lhu" | "invoice";
  entityId: string;
  fromStatus: string;
  toStatus: string;
  override: boolean;
  reason: string | null;
  createdAt: string;
};

export type LimsData = {
  version: 2;
  customers: Customer[];
  sites: CustomerSite[];
  matrices: Matrix[];
  parameters: Parameter[];
  methods: Method[];
  units: Unit[];
  jobs: Job[];
  samplingEvents: SamplingEvent[];
  samples: Sample[];
  results: TestResult[];
  lhuRecords: LhuRecord[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  profiles: StaffProfile[];
};
