"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/use-auth";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/status/job";
import { isValidDueDate } from "@/lib/status/job-gate";
import { formatDateId } from "@/lib/datetime";
import { firstSiteIdForCustomer, sitesForCustomer } from "@/lib/domain/sites";
import { useLims } from "@/lib/store/lims-provider";

export default function JobsPage() {
  const { user } = useAuth();
  const { data, createJob, isLoading, loadError } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const [status, setStatus] = useState<string>("all");
  const [customerId, setCustomerId] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    siteId: "",
    dueDate: "",
    scope: "",
  });

  useEffect(() => {
    setForm((prev) => {
      const customerId = prev.customerId || data.customers[0]?.id || "";
      if (!customerId) return prev;
      const sites = sitesForCustomer(data.sites, customerId);
      const siteId = sites.some((s) => s.id === prev.siteId)
        ? prev.siteId
        : firstSiteIdForCustomer(data.sites, customerId);
      if (customerId === prev.customerId && siteId === prev.siteId) return prev;
      return { ...prev, customerId, siteId };
    });
  }, [data.customers, data.sites]);

  const sites = sitesForCustomer(data.sites, form.customerId);

  const jobs = useMemo(
    () =>
      data.jobs.filter((j) => {
        if (status !== "all" && j.status !== status) return false;
        if (customerId !== "all" && j.customerId !== customerId) return false;
        return true;
      }),
    [data.jobs, status, customerId],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Job Order"
        description="Registrasi pekerjaan laboratorium. Nomor: PCS-YYMMDD-NNN. Status hanya lewat transisi legal."
      />
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {JOB_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua customer</SelectItem>
            {data.customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Panel title="Daftar job">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-[#5d7266]">
                  {isLoading
                    ? "Memuat job…"
                    : loadError
                      ? `Gagal memuat daftar: ${loadError}`
                      : "Tidak ada job."}
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const customer = data.customers.find((c) => c.id === job.customerId);
                const site = data.sites.find((s) => s.id === job.siteId);
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.jobNo}</TableCell>
                    <TableCell>{customer?.companyName ?? "—"}</TableCell>
                    <TableCell>{site?.name ?? "—"}</TableCell>
                    <TableCell>{formatDateId(job.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge entity="job" status={job.status} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`} className="text-sm text-[#16A34A] underline">
                        Buka
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>

      {canWrite ? (
        <Panel title="Buat job order (draf)">
          <p className="mb-3 text-sm text-[#5d7266]">
            Customer hanya dari data yang sudah ada. Tidak ada pembuatan customer di layar ini.
          </p>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const existing = data.customers.find((c) => c.id === form.customerId);
              if (!existing) {
                setMessage("Pilih customer yang sudah terdaftar.");
                return;
              }
              if (form.dueDate && !isValidDueDate(form.dueDate)) {
                setMessage("Due date tidak valid.");
                return;
              }
              createJob({
                customerId: existing.id,
                siteId: form.siteId,
                matrixId: "",
                dueDate: form.dueDate,
                scope: form.scope,
              });
              setMessage("Job draf dibuat.");
            }}
          >
            <Field label="Customer (existing)">
              <Select
                value={form.customerId || undefined}
                onValueChange={(id) => {
                  setForm({
                    ...form,
                    customerId: id,
                    siteId: firstSiteIdForCustomer(data.sites, id),
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih customer" />
                </SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Site">
              <Select
                value={form.siteId || undefined}
                onValueChange={(id) => setForm({ ...form, siteId: id })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sites.length ? "Pilih site" : "Tidak ada site untuk customer ini"} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Lingkup pekerjaan">
                <Textarea
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                />
              </Field>
            </div>
            <Button
              type="submit"
              className="bg-[#16A34A] hover:bg-[#14532D]"
              disabled={data.customers.length === 0}
            >
              Buat Job
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-[#14532D]">{message}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
