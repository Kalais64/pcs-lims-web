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
import { SAMPLING_STATUSES, SAMPLING_STATUS_LABELS } from "@/lib/status/sampling";
import { useLims } from "@/lib/store/lims-provider";

export default function SamplingPage() {
  const { data, createSampling, markSamplingDone } = useLims();
  const [status, setStatus] = useState("all");
  const [jobId, setJobId] = useState("all");
  const [form, setForm] = useState({
    jobId: data.jobs[0]?.id ?? "",
    siteId: data.jobs[0]?.siteId ?? "",
    date: "",
    petugas: "Andri Sampler",
  });

  const rows = useMemo(
    () =>
      data.samplingEvents.filter((e) => {
        if (status !== "all" && e.status !== status) return false;
        if (jobId !== "all" && e.jobId !== jobId) return false;
        return true;
      }),
    [data.samplingEvents, status, jobId],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sampling"
        description="Jadwal tipis: job, lokasi, tanggal, dan petugas."
      />
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {SAMPLING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SAMPLING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua job</SelectItem>
            {data.jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.jobNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Panel title="Jadwal sampling">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Petugas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((ev) => {
              const job = data.jobs.find((j) => j.id === ev.jobId);
              const site = data.sites.find((s) => s.id === ev.siteId);
              return (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{job?.jobNo}</TableCell>
                  <TableCell>{site?.name}</TableCell>
                  <TableCell>{ev.date}</TableCell>
                  <TableCell>{ev.petugas}</TableCell>
                  <TableCell>
                    <StatusBadge entity="sampling" status={ev.status} />
                  </TableCell>
                  <TableCell>
                    {ev.status === "scheduled" ? (
                      <Button size="sm" variant="outline" onClick={() => markSamplingDone(ev.id)}>
                        Tandai selesai
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Jadwalkan sampling">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createSampling(form);
          }}
        >
          <div className="space-y-1">
            <Label>Job</Label>
            <Select
              value={form.jobId}
              onValueChange={(id) => {
                const job = data.jobs.find((j) => j.id === id);
                setForm({ ...form, jobId: id, siteId: job?.siteId ?? form.siteId });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.jobNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Site</Label>
            <Select value={form.siteId} onValueChange={(id) => setForm({ ...form, siteId: id })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tanggal</Label>
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Petugas</Label>
            <Input
              required
              value={form.petugas}
              onChange={(e) => setForm({ ...form, petugas: e.target.value })}
            />
          </div>
          <Button type="submit" className="bg-[#168cc5] hover:bg-[#0a4f7b]">
            Simpan jadwal
          </Button>
        </form>
      </Panel>
    </div>
  );
}
