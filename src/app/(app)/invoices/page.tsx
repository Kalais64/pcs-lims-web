"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/status/invoice";
import { useLims } from "@/lib/store/lims-provider";

export default function InvoicesPage() {
  const { user } = useAuth();
  const { data, createInvoice, markInvoice } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "finance";
  const [status, setStatus] = useState("all");
  const [jobId, setJobId] = useState(data.jobs.find((j) => j.status === "lhu_issued")?.id ?? "");
  const [amount, setAmount] = useState("15000000");
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(
    () => data.invoices.filter((i) => status === "all" || i.status === status),
    [data.invoices, status],
  );
  const eligible = data.jobs.filter((j) => j.status === "lhu_issued");
  const unpaid = rows.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + i.amount, 0);
  const paid = rows.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoice & AR"
        description="Stub tagihan setelah LHU terbit. Status unpaid / paid / void."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <small className="text-[#5d7266]">Outstanding (unpaid)</small>
          <div className="mt-1 text-[27px] font-bold text-[#146338]">
            Rp {unpaid.toLocaleString("id-ID")}
          </div>
        </Panel>
        <Panel>
          <small className="text-[#5d7266]">Lunas</small>
          <div className="mt-1 text-[27px] font-bold text-[#146338]">
            Rp {paid.toLocaleString("id-ID")}
          </div>
        </Panel>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[200px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua status</SelectItem>
          {INVOICE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Panel title="Daftar invoice">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-[#5d7266]">
                  Belum ada invoice.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((inv) => {
                const job = data.jobs.find((j) => j.id === inv.jobId);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell>{job?.jobNo}</TableCell>
                    <TableCell>Rp {inv.amount.toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                      <StatusBadge entity="invoice" status={inv.status} />
                    </TableCell>
                    <TableCell className="space-x-2">
                      {canWrite && inv.status === "unpaid" ? (
                        <Button size="sm" variant="outline" onClick={() => void markInvoice(inv.id, "paid")}>
                          Tandai lunas
                        </Button>
                      ) : null}
                      {canWrite && inv.status !== "void" ? (
                        <Button size="sm" variant="ghost" onClick={() => void markInvoice(inv.id, "void")}>
                          Void
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>

      {canWrite ? (
        <Panel title="Buat invoice dari job (setelah LHU)">
          {eligible.length === 0 ? (
            <p className="text-sm text-[#5d7266]">Tidak ada job berstatus LHU terbit.</p>
          ) : (
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await createInvoice(jobId, Number(amount));
                setMessage(res.ok ? "Invoice stub dibuat (unpaid)." : res.message);
              }}
            >
              <div className="space-y-1">
                <Label>Job</Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih job" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligible.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.jobNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nominal (Rp)</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <Button type="submit" className="self-end bg-[#1f8a4c] hover:bg-[#146338]">
                Buat invoice
              </Button>
            </form>
          )}
          {message ? <p className="mt-3 text-sm text-[#146338]">{message}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}
