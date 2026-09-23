"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
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
import { DEMO_USERS } from "@/lib/fixtures/users";
import { useAuth } from "@/lib/hooks/use-auth";
import { LHU_STATUSES, LHU_STATUS_LABELS } from "@/lib/status/lhu";
import { useLims } from "@/lib/store/lims-provider";

export default function LhuPage() {
  const { user } = useAuth();
  const { data, issueLhu } = useLims();
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState<string | null>(null);

  const readyJobs = data.jobs.filter((j) => j.status === "lhu_ready");
  const rows = useMemo(
    () => data.lhuRecords.filter((l) => status === "all" || l.status === status),
    [data.lhuRecords, status],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="LHU"
        description="Record Laporan Hasil Uji: nomor, revisi, penerbit, waktu terbit, status. Bukan PDF/QR."
      />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[200px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua status</SelectItem>
          {LHU_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LHU_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Panel title="Daftar LHU">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. LHU</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Rev</TableHead>
              <TableHead>Penerbit</TableHead>
              <TableHead>Terbit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-[#6b7d89]">
                  Belum ada LHU.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((l) => {
                const job = data.jobs.find((j) => j.id === l.jobId);
                const issuer = DEMO_USERS.find((u) => u.id === l.issuerId);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.lhuNo}</TableCell>
                    <TableCell>{job?.jobNo}</TableCell>
                    <TableCell>{l.revision}</TableCell>
                    <TableCell>{issuer?.name ?? l.issuerId}</TableCell>
                    <TableCell>
                      {l.issuedAt ? new Date(l.issuedAt).toLocaleString("id-ID") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge entity="lhu" status={l.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Terbitkan LHU">
        {readyJobs.length === 0 ? (
          <p className="text-sm text-[#6b7d89]">Tidak ada job berstatus Siap LHU.</p>
        ) : (
          <ul className="space-y-2">
            {readyJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3">
                <span>
                  {job.jobNo} · {data.customers.find((c) => c.id === job.customerId)?.companyName}
                </span>
                <Button
                  className="bg-[#168cc5] hover:bg-[#0a4f7b]"
                  onClick={() => {
                    if (!user) return;
                    const res = issueLhu(job.id, user);
                    setMessage(res.ok ? `LHU diterbitkan untuk ${job.jobNo}.` : res.message);
                  }}
                >
                  Terbitkan record
                </Button>
              </li>
            ))}
          </ul>
        )}
        {message ? <p className="mt-3 text-sm text-[#0a4f7b]">{message}</p> : null}
      </Panel>
    </div>
  );
}
