"use client";

import { useMemo, useState } from "react";
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
import { SAMPLE_STATUSES, SAMPLE_STATUS_LABELS } from "@/lib/status/sample";
import { useLims } from "@/lib/store/lims-provider";

export default function SamplesPage() {
  const { user } = useAuth();
  const { data, createSample, receiveSample } = useLims();
  const canCreate = user && ["admin", "sampler", "analyst", "sales"].includes(user.role);
  const [status, setStatus] = useState("all");
  const [jobId, setJobId] = useState("all");
  const [matrixId, setMatrixId] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    jobId: data.jobs[0]?.id ?? "",
    matrixId: data.jobs[0]?.matrixId ?? data.matrices[0]?.id ?? "",
  });
  const [receive, setReceive] = useState<Record<string, { at: string; notes: string }>>({});

  const rows = useMemo(
    () =>
      data.samples.filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (jobId !== "all" && s.jobId !== jobId) return false;
        if (matrixId !== "all" && s.matrixId !== matrixId) return false;
        return true;
      }),
    [data.samples, status, jobId, matrixId],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sample Tracking"
        description="Sample ID PCS-S-YYMMDD-NNN, penerimaan, dan catatan kondisi (CoC MVP)."
      />
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {SAMPLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SAMPLE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger className="w-[200px] bg-white">
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
        <Select value={matrixId} onValueChange={setMatrixId}>
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua matriks</SelectItem>
            {data.matrices.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Panel title="Daftar sampel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sample ID</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Matriks</TableHead>
              <TableHead>Diterima</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Terima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const job = data.jobs.find((j) => j.id === s.jobId);
              const matrix = data.matrices.find((m) => m.id === s.matrixId);
              const rec = receive[s.id] ?? {
                at: new Date().toISOString().slice(0, 16),
                notes: s.conditionNotes,
              };
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.sampleNo}</TableCell>
                  <TableCell>{job?.jobNo}</TableCell>
                  <TableCell>{matrix?.name}</TableCell>
                  <TableCell>
                    {s.receivedAt ? new Date(s.receivedAt).toLocaleString("id-ID") : "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{s.conditionNotes || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge entity="sample" status={s.status} />
                  </TableCell>
                  <TableCell>
                    {s.status === "expected" ? (
                      <div className="flex min-w-[240px] flex-col gap-1">
                        <Input
                          type="datetime-local"
                          value={rec.at}
                          onChange={(e) =>
                            setReceive({ ...receive, [s.id]: { ...rec, at: e.target.value } })
                          }
                        />
                        <Textarea
                          placeholder="Catatan kondisi / receive notes"
                          value={rec.notes}
                          onChange={(e) =>
                            setReceive({ ...receive, [s.id]: { ...rec, notes: e.target.value } })
                          }
                        />
                        <Button
                          size="sm"
                          className="bg-[#168cc5] hover:bg-[#0a4f7b]"
                          onClick={() => {
                            const iso = rec.at ? new Date(rec.at).toISOString() : new Date().toISOString();
                            const res = receiveSample(s.id, iso, rec.notes);
                            setError(res.ok ? null : res.message);
                          }}
                        >
                          Terima sampel
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Panel>

      {canCreate ? (
        <Panel title="Daftarkan sampel">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createSample(createForm);
            }}
          >
            <div className="space-y-1">
              <Label>Job</Label>
              <Select
                value={createForm.jobId}
                onValueChange={(id) => {
                  const job = data.jobs.find((j) => j.id === id);
                  setCreateForm({
                    jobId: id,
                    matrixId: job?.matrixId ?? createForm.matrixId,
                  });
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
              <Label>Matriks</Label>
              <Select
                value={createForm.matrixId}
                onValueChange={(id) => setCreateForm({ ...createForm, matrixId: id })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.matrices.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="self-end bg-[#168cc5] hover:bg-[#0a4f7b]">
              Buat Sample ID
            </Button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
