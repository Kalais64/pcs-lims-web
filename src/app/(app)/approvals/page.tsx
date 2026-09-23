"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { staffName, useLims } from "@/lib/store/lims-provider";

export default function ApprovalsPage() {
  const { user, switchRole, mode } = useAuth();
  const { data, verifySample, approveSample, rejectSample } = useLims();
  const [status, setStatus] = useState("queue");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      data.samples.filter((s) => {
        if (status === "queue") return s.status === "pending_verify" || s.status === "pending_approve";
        return s.status === status;
      }),
    [data.samples, status],
  );

  function actorName(id: string | null) {
    return staffName(data, id);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verifikasi & Approval"
        description="Dual control: Verify (Review) lalu Approve oleh dua pengguna berbeda. Override Admin tercatat di audit."
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5d7266]">
        <span>Anda: {user?.name}</span>
        {mode === "fixtures" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => switchRole("verifier")}>
              Jadi Verifier
            </Button>
            <Button size="sm" variant="outline" onClick={() => switchRole("approver")}>
              Jadi Approver
            </Button>
          </>
        ) : (
          <span>
            Dual control live: masuk sebagai user Auth lain (verifier ≠ approver). Role switch
            dimatikan agar tidak mensimulasikan auth.uid().
          </span>
        )}
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[240px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="queue">Antrean aktif</SelectItem>
          <SelectItem value="pending_verify">Menunggu verifikasi</SelectItem>
          <SelectItem value="pending_approve">Menunggu approval</SelectItem>
          <SelectItem value="approved">Disetujui</SelectItem>
          <SelectItem value="rejected">Ditolak</SelectItem>
        </SelectContent>
      </Select>

      <Panel title="Antrean sampel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sample</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Parameter</TableHead>
              <TableHead>Analis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verify / Approve</TableHead>
              <TableHead>Tolak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-[#5d7266]">
                  Tidak ada sampel di filter ini.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const job = data.jobs.find((j) => j.id === s.jobId);
                const results = data.results.filter((r) => r.sampleId === s.id);
                const analyst = results[0]?.analystId;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sampleNo}</TableCell>
                    <TableCell>{job?.jobNo}</TableCell>
                    <TableCell>
                      {results.length} parameter
                      <div className="text-xs text-[#5d7266]">
                        {results
                          .map((r) => data.parameters.find((p) => p.id === r.parameterId)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </TableCell>
                    <TableCell>{actorName(analyst ?? null)}</TableCell>
                    <TableCell>
                      <StatusBadge entity="sample" status={s.status} />
                      <div className="mt-1 text-[11px] text-[#5d7266]">
                        Verify: {actorName(s.verifiedById)}
                      </div>
                    </TableCell>
                    <TableCell className="space-y-1">
                      {s.status === "pending_verify" ? (
                        <Button
                          size="sm"
                          className="bg-[#16A34A] hover:bg-[#14532D]"
                          onClick={async () => {
                            if (!user) return;
                            const res = await verifySample(s.id, user);
                            setMessage(res.ok ? `${s.sampleNo} diverifikasi.` : res.message);
                          }}
                        >
                          Verify
                        </Button>
                      ) : null}
                      {s.status === "pending_approve" || s.status === "pending_verify" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!user) return;
                            const override = user.role === "admin" && s.status === "pending_verify";
                            const res = await approveSample(s.id, user, override);
                            setMessage(res.ok ? `${s.sampleNo} disetujui.` : res.message);
                          }}
                        >
                          Approve
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[180px] flex-col gap-1">
                        <Input
                          placeholder="Alasan wajib"
                          value={reasons[s.id] ?? ""}
                          onChange={(e) => setReasons({ ...reasons, [s.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!user) return;
                            const res = await rejectSample(s.id, user, reasons[s.id] ?? "");
                            setMessage(res.ok ? `${s.sampleNo} ditolak.` : res.message);
                          }}
                        >
                          Tolak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {message ? <p className="mt-3 text-sm text-[#14532D]">{message}</p> : null}
        <p className="mt-3 text-xs text-[#5d7266]">
          Tombol mockup “Review” dipetakan ke Verify. Approve oleh user yang sama dengan
          verifier akan ditolak, kecuali Admin mencentang override (aksi Approve saat masih
          pending_verify sebagai Admin).
        </p>
      </Panel>
    </div>
  );
}
