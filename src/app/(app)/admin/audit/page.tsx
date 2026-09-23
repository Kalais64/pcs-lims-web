"use client";

import { useMemo, useState } from "react";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Badge } from "@/components/ui/badge";
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
import {
  auditInDateRange,
  auditOverride,
  auditSampleCode,
  summarizeAudit,
} from "@/lib/domain/audit";
import { formatDateTimeId, parseDate } from "@/lib/datetime";
import { useAuth } from "@/lib/hooks/use-auth";
import { staffName, useLims } from "@/lib/store/lims-provider";

export default function AdminAuditPage() {
  const { user } = useAuth();
  const { data, isLoading, loadError } = useLims();
  const [tableName, setTableName] = useState("all");
  const [actorId, setActorId] = useState("all");
  const [action, setAction] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const tables = useMemo(
    () => [...new Set(data.auditLogs.map((log) => log.tableName).filter(Boolean))].sort(),
    [data.auditLogs],
  );
  const actors = useMemo(
    () => [...new Set(data.auditLogs.map((log) => log.actorId).filter(Boolean))].sort(),
    [data.auditLogs],
  );
  const actions = useMemo(
    () => [...new Set(data.auditLogs.map((log) => log.action).filter(Boolean))].sort(),
    [data.auditLogs],
  );

  const dateError = useMemo(() => {
    if (fromDate && !parseDate(`${fromDate}T00:00:00`)) return "Tanggal mulai tidak valid.";
    if (toDate && !parseDate(`${toDate}T00:00:00`)) return "Tanggal akhir tidak valid.";
    if (fromDate && toDate && fromDate > toDate) return "Rentang tanggal tidak valid.";
    return null;
  }, [fromDate, toDate]);

  const rows = useMemo(() => {
    if (dateError) return [];
    return [...data.auditLogs]
      .filter((log) => {
        if (tableName !== "all" && log.tableName !== tableName) return false;
        if (actorId !== "all" && log.actorId !== actorId) return false;
        if (action !== "all" && log.action !== action) return false;
        if ((fromDate || toDate) && !auditInDateRange(log.occurredAt, fromDate, toDate)) return false;
        return true;
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [action, actorId, data.auditLogs, dateError, fromDate, tableName, toDate]);

  if (user?.role !== "admin") {
    return <p className="text-sm text-[#5d7266]">Hanya Admin yang dapat membaca jejak audit.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jejak audit"
        description="Append-only (kunci produk). Hanya baca + filter. Tidak ada ubah, hapus, kosongkan, reset, atau arsip baris — termasuk untuk Admin."
      />
      <AdminSubnav />
      <Panel title="Filter">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Field label="Entitas / tabel">
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tabel</SelectItem>
                {tables.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Aktor">
            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua aktor</SelectItem>
                {actors.map((id) => (
                  <SelectItem key={id} value={id}>
                    {staffName(data, id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipe aksi">
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua aksi</SelectItem>
                {actions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dari tanggal">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Sampai tanggal">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>
        {dateError ? <p className="mt-2 text-sm text-red-600">{dateError}</p> : null}
      </Panel>

      <Panel title="Riwayat (hanya baca)">
        <Table aria-readonly="true">
          <TableHeader>
            <TableRow>
              <TableHead>Waktu (WIB)</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Tabel</TableHead>
              <TableHead>Baris / kode</TableHead>
              <TableHead>Ringkasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-[#5d7266]">
                  {isLoading
                    ? "Memuat jejak audit…"
                    : loadError
                      ? `Gagal memuat: ${loadError}`
                      : dateError
                        ? "Perbaiki filter tanggal."
                        : "Tidak ada jejak untuk filter ini."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => {
                const sample = data.samples.find((item) => item.id === log.rowId);
                const code = auditSampleCode(log) || sample?.sampleCode || sample?.sampleNo || "";
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTimeId(log.occurredAt)}</TableCell>
                    <TableCell>{staffName(data, log.actorId)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{log.action}</span>
                        {auditOverride(log) ? (
                          <Badge className="border-transparent bg-[#fef3c7] text-[#92400e]">override</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{log.tableName || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {code ? `${code} · ` : ""}
                      {log.rowId || "—"}
                    </TableCell>
                    <TableCell className="max-w-[360px] text-sm">{summarizeAudit(log)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>
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
