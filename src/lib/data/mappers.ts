import { ROLES, type Role } from "@/lib/auth/types";
import type {
  AuditLog,
  Customer,
  CustomerSite,
  Invoice,
  Job,
  LhuRecord,
  Matrix,
  Method,
  Parameter,
  Sample,
  SamplingEvent,
  StaffProfile,
  TestResult,
  Unit,
} from "@/lib/domain/types";
import { normalizeInvoiceStatus } from "@/lib/status/invoice";
import { normalizeJobStatus } from "@/lib/status/job";
import { normalizeLhuStatus } from "@/lib/status/lhu";
import { normalizeSampleStatus } from "@/lib/status/sample";
import type { SamplingStatus } from "@/lib/status/sampling";
import { asRows, dateOnly, pickNullable, pickNumber, pickString } from "@/lib/data/pick";

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function mapProfiles(data: unknown): StaffProfile[] {
  return asRows(data).map((row) => {
    const roleRaw = pickString(row, ["role", "user_role"], "sales");
    return {
      id: pickString(row, ["id", "user_id"]),
      name: pickString(row, ["full_name", "name", "display_name", "email"]),
      email: pickString(row, ["email"]),
      role: isRole(roleRaw) ? roleRaw : "sales",
    };
  });
}

export function mapCustomers(data: unknown): Customer[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    companyName: pickString(row, ["company_name", "name", "legal_name"]),
    pic: pickString(row, ["pic", "pic_name", "contact_name", "hse_name"]),
    email: pickString(row, ["email", "pic_email"]),
    phone: pickString(row, ["phone", "pic_phone", "telephone"]),
    address: pickString(row, ["address", "company_address"]),
  }));
}

export function mapSites(data: unknown): CustomerSite[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    customerId: pickString(row, ["customer_id"]),
    name: pickString(row, ["name", "site_name"]),
    address: pickString(row, ["address", "site_address"]),
  }));
}

export function mapNamed(data: unknown): Array<{ id: string; name: string }> {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    name: pickString(row, ["name", "code", "label"]),
  })).filter((row) => row.id);
}

export function mapParameters(data: unknown): Parameter[] {
  return asRows(data)
    .map((row) => ({
      id: pickString(row, ["id"]),
      name: pickString(row, ["name", "code", "label", "parameter_name"]),
      unit: pickString(row, ["unit", "unit_name", "satuan", "default_unit", "uom"]) || undefined,
    }))
    .filter((row) => row.id);
}

export function unitsFromParameters(parameters: Parameter[]): Unit[] {
  const seen = new Map<string, Unit>();
  for (const parameter of parameters) {
    const name = parameter.unit?.trim();
    if (!name) continue;
    if (!seen.has(name)) seen.set(name, { id: name, name });
  }
  return [...seen.values()];
}

export function mapJobs(data: unknown): Job[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    jobNo: pickString(row, ["number", "job_no", "job_number", "code"]),
    customerId: pickString(row, ["customer_id"]),
    siteId: pickString(row, ["site_id", "customer_site_id"]),
    matrixId: pickString(row, ["matrix_id"]),
    dueDate: dateOnly(pickString(row, ["due_date", "due_at"])),
    scope: pickString(row, ["scope", "notes", "description"]),
    status: normalizeJobStatus(pickString(row, ["status"])),
    createdAt: pickString(row, ["created_at"], new Date().toISOString()),
  }));
}

export function mapSampling(data: unknown): SamplingEvent[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    jobId: pickString(row, ["job_id"]),
    siteId: pickString(row, ["site_id", "customer_site_id"]),
    date: dateOnly(pickString(row, ["date", "scheduled_date", "sampling_date"])),
    petugas: pickString(row, ["petugas", "sampler_name", "officer_name", "assigned_to_name"]),
    status: pickString(row, ["status"], "scheduled") as SamplingStatus,
  }));
}

export function mapSamples(data: unknown): Sample[] {
  return asRows(data)
    .map((row) => {
      const sampleCode = pickString(row, ["sample_code"]);
      const id = pickString(row, ["id"]);
      const receiveNotes = pickString(row, ["receive_notes"]);
      return {
        id,
        sampleNo: sampleCode || id,
        sampleCode: sampleCode || id,
        jobId: pickString(row, ["job_id"]),
        matrixId: pickString(row, ["matrix_id"]),
        status: normalizeSampleStatus(pickString(row, ["status"])),
        receivedAt: pickNullable(row, ["received_at"]),
        collectedAt: pickNullable(row, ["collected_at"]),
        barcode: pickString(row, ["barcode"]),
        storageLocation: pickString(row, ["storage_location"]),
        conditionNotes: receiveNotes,
        notes: pickString(row, ["notes"]),
        verifiedById: pickNullable(row, ["verified_by"]),
        approvedById: pickNullable(row, ["approved_by"]),
        rejectReason: null,
        createdAt: pickString(row, ["created_at"]) || new Date().toISOString(),
      };
    })
    .filter((row) => row.id);
}

export function mapResults(data: unknown): TestResult[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    sampleId: pickString(row, ["sample_id"]),
    parameterId: pickString(row, ["parameter_id"]),
    methodId: pickString(row, ["method_id"]),
    unitId: pickString(row, ["unit_id", "unit", "satuan"]),
    result: pickString(row, ["result", "value", "result_value", "result_text"]),
    analystId: pickString(row, ["analyst_id", "tested_by"]),
    testedAt: pickString(row, ["tested_at", "created_at"], new Date().toISOString()),
  }));
}

export function mapLhu(data: unknown): LhuRecord[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    lhuNo: pickString(row, ["lhu_number", "lhu_no", "document_no", "number"]),
    jobId: pickString(row, ["job_id"]),
    revision: pickNumber(row, ["revision", "rev"], 0),
    issuerId: pickString(row, ["issuer_id", "issued_by", "approved_by"]),
    issuedAt: pickNullable(row, ["issued_at"]),
    status: normalizeLhuStatus(pickString(row, ["status"])),
  }));
}

export function mapInvoices(data: unknown): Invoice[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    invoiceNo: pickString(row, ["invoice_no", "invoice_number", "number"]),
    jobId: pickString(row, ["job_id"]),
    amount: pickNumber(row, ["amount", "total", "grand_total"]),
    status: normalizeInvoiceStatus(pickString(row, ["status"])),
    createdAt: pickString(row, ["created_at"], new Date().toISOString()),
  }));
}

export function mapAudit(data: unknown): AuditLog[] {
  return asRows(data).map((row) => ({
    id: pickString(row, ["id"]),
    actorId: pickString(row, ["actor_id", "user_id"]),
    entityType: pickString(row, ["entity_type", "entity"], "sample") as AuditLog["entityType"],
    entityId: pickString(row, ["entity_id"]),
    fromStatus: pickString(row, ["from_status"]),
    toStatus: pickString(row, ["to_status"]),
    override: Boolean(row.override),
    reason: pickNullable(row, ["reason"]),
    createdAt: pickString(row, ["created_at"], new Date().toISOString()),
  }));
}

export function asMatrices(data: unknown): Matrix[] {
  return mapNamed(data);
}
export function asParameters(data: unknown): Parameter[] {
  return mapParameters(data);
}
export function asMethods(data: unknown): Method[] {
  return mapNamed(data);
}
