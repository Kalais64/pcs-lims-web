"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { JobStatusBar, type JobGatedAction } from "@/components/status/job-status-bar";
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
import { useAuth } from "@/lib/hooks/use-auth";
import {
  canChangeJobCustomer,
  canEditJobDueOrScope,
  canEditJobSite,
  criticalJobFieldsLocked,
  isValidDueDate,
  jobHasChildren,
} from "@/lib/status/job-gate";
import { useLims } from "@/lib/store/lims-provider";
import type { ActionResult } from "@/lib/store/context";
import { formatDateId } from "@/lib/datetime";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, updateJobFields, transitionJobStatus } = useLims();

  const job = data.jobs.find((j) => j.id === params.id || j.jobNo === params.id);
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    siteId: "",
    dueDate: "",
    scope: "",
  });

  useEffect(() => {
    if (!job) return;
    setForm({
      customerId: job.customerId,
      siteId: job.siteId,
      dueDate: job.dueDate,
      scope: job.scope,
    });
  }, [job]);

  const editCustomer = Boolean(user && job && canChangeJobCustomer(job.status, user.role));
  const editSite = Boolean(user && job && canEditJobSite(job.status, user.role));
  const editDueScope = Boolean(user && job && canEditJobDueOrScope(job.status, user.role));
  const locked = job ? criticalJobFieldsLocked(job.status) : true;
  const hasChildren = job ? jobHasChildren(data, job.id) : false;
  const sites = data.sites.filter((s) => s.customerId === form.customerId);

  const samples = useMemo(
    () => data.samples.filter((s) => s.jobId === job?.id),
    [data.samples, job?.id],
  );

  async function run(label: string, fn: () => ActionResult | Promise<ActionResult>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMessage(res.ok ? label : res.message);
    return res.ok;
  }

  async function onAction(action: JobGatedAction) {
    if (!job || !user) return;
    if (action.key === "edit") {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!action.allowed || !action.toStatus) return;
    if (action.key === "cancel" && action.reasonRequired && !cancelReason.trim()) {
      setMessage("Alasan pembatalan wajib diisi (Admin, status sampling ke atas).");
      return;
    }
    await run(
      action.key === "cancel" ? "Job dibatalkan (soft)." : `Status: ${action.label}.`,
      () =>
        transitionJobStatus(job.id, action.toStatus!, user, {
          reason: action.key === "cancel" ? cancelReason.trim() || null : null,
        }),
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Job Order"
          description={isLoading ? "Memuat job…" : "Detail tidak ditemukan."}
        />
        <Link href="/jobs" className="text-sm text-[#16A34A] underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const customer = data.customers.find((c) => c.id === job.customerId);
  const site = data.sites.find((s) => s.id === job.siteId);

  return (
    <div className="space-y-5">
      <PageHeader
        title={job.jobNo}
        description={`${customer?.companyName ?? "Customer"} · ${site?.name ?? "Site"}`}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/jobs")}>
            Kembali
          </Button>
        }
      />

      <JobStatusBar job={job} user={user} busy={busy} onAction={onAction} />

      {job.status !== "cancelled" && job.status !== "closed" ? (
        <div className="space-y-1">
          <Label>Alasan batal (wajib untuk Admin setelah sampling)</Label>
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Alasan pembatalan"
          />
        </div>
      ) : null}

      <Panel title={editDueScope || editSite || editCustomer ? "Edit field" : "Data job (terkunci)"}>
        {locked ? (
          <p className="mb-3 text-sm text-[#5d7266]">
            Status {job.status}: customer, site, dan nomor terkunci.
            {editDueScope
              ? " Admin boleh mengubah due date / lingkup (tercatat audit)."
              : " Due date / lingkup disembunyikan dari edit untuk peran ini."}
          </p>
        ) : (
          <p className="mb-3 text-sm text-[#5d7266]">
            Free edit hanya saat draf atau terjadwal (Sales/Admin). Nomor job tidak diubah.
            Customer hanya bisa diganti saat draf.
          </p>
        )}
        <form
          ref={formRef}
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user || !(editDueScope || editSite || editCustomer)) return;
            if (form.dueDate && !isValidDueDate(form.dueDate)) {
              setMessage("Due date tidak valid.");
              return;
            }
            if (form.customerId && !data.customers.some((c) => c.id === form.customerId)) {
              setMessage("Customer harus sudah terdaftar.");
              return;
            }
            await run("Perubahan disimpan.", () =>
              updateJobFields(
                job.id,
                {
                  customerId: editCustomer ? form.customerId : undefined,
                  siteId: editSite ? form.siteId : undefined,
                  dueDate: editDueScope ? form.dueDate : undefined,
                  scope: editDueScope ? form.scope : undefined,
                },
                user,
              ),
            );
          }}
        >
          <div className="space-y-1">
            <Label>Nomor job</Label>
            <Input disabled value={job.jobNo} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <div className="pt-2">
              <StatusBadge entity="job" status={job.status} />
            </div>
          </div>
          {editCustomer ? (
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select
                value={form.customerId || undefined}
                onValueChange={(id) => {
                  const firstSite = data.sites.find((s) => s.customerId === id);
                  setForm({ ...form, customerId: id, siteId: firstSite?.id ?? "" });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Customer</Label>
              <Input disabled value={customer?.companyName ?? "—"} />
            </div>
          )}
          {editSite ? (
            <div className="space-y-1">
              <Label>Site</Label>
              <Select
                value={form.siteId || undefined}
                onValueChange={(id) => setForm({ ...form, siteId: id })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Site</Label>
              <Input disabled value={site?.name ?? "—"} />
            </div>
          )}
          {editDueScope ? (
            <>
              <div className="space-y-1">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Lingkup pekerjaan</Label>
                <Textarea
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Due date</Label>
                <Input disabled value={formatDateId(job.dueDate)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Lingkup pekerjaan</Label>
                <Textarea disabled value={job.scope} />
              </div>
            </>
          )}
          {editDueScope || editSite || editCustomer ? (
            <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
              Simpan field
            </Button>
          ) : null}
        </form>
        <p className="mt-3 text-xs text-[#5d7266]">
          Hapus keras disembunyikan.
          {hasChildren
            ? " Job ini punya sampel / sampling / LHU / invoice — hanya pembatalan lunak."
            : " Prefer batalkan (cancelled), bukan hapus."}
        </p>
      </Panel>

      <Panel title="Sampel terkait">
        {samples.length === 0 ? (
          <p className="text-sm text-[#5d7266]">Belum ada sampel pada job ini.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {samples.map((s) => (
              <li key={s.id}>
                <Link href={`/samples/${s.id}`} className="text-[#16A34A] underline">
                  {s.sampleNo}
                </Link>{" "}
                · {s.status}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {message ? <p className="text-sm text-[#14532D]">{message}</p> : null}
    </div>
  );
}
