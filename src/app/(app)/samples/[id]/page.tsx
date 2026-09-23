"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { SampleStatusBar, type SampleGatedAction } from "@/components/status/sample-status-bar";
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
import { canFreeEditSample, criticalFieldsLocked, submitTarget } from "@/lib/status/sample-gate";
import { staffName, useLims } from "@/lib/store/lims-provider";
import type { ActionResult } from "@/lib/store/context";
import { optionsForForm } from "@/lib/domain/masters";
import { fromLocalInput, safeIso, toLocalInput } from "@/lib/datetime";

export default function SampleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    updateSampleFields,
    archiveSample,
    startTesting,
    submitForVerify,
    verifySample,
    approveSample,
    rejectSample,
    receiveSample,
  } = useLims();

  const sample = data.samples.find(
    (s) => s.id === params.id || s.sampleCode === params.id || s.sampleNo === params.id,
  );
  const job = data.jobs.find((j) => j.id === sample?.jobId);
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState({
    matrixId: "",
    sampleCode: "",
    receiveNotes: "",
    notes: "",
    barcode: "",
    storageLocation: "",
    collectedAt: "",
  });

  useEffect(() => {
    if (!sample) return;
    setForm({
      matrixId: sample.matrixId,
      sampleCode: sample.sampleCode,
      receiveNotes: sample.conditionNotes,
      notes: sample.notes,
      barcode: sample.barcode,
      storageLocation: sample.storageLocation,
      collectedAt: toLocalInput(sample.collectedAt),
    });
  }, [sample]);

  const editable = Boolean(user && sample && canFreeEditSample(sample.status, user.role));
  const locked = sample ? criticalFieldsLocked(sample.status) : true;

  const results = useMemo(
    () => data.results.filter((r) => r.sampleId === sample?.id),
    [data.results, sample?.id],
  );

  async function run(label: string, fn: () => ActionResult | Promise<ActionResult>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMessage(res.ok ? label : res.message);
    return res.ok;
  }

  async function onAction(action: SampleGatedAction) {
    if (!sample || !user) return;
    if (action.key === "edit") {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!action.allowed) return;
    if (action.key === "archive") {
      await run("Sampel diarsipkan.", () => archiveSample(sample.id, user, "Arsip dari status bar"));
      return;
    }
    if (action.key === "submit") {
      const to = submitTarget(sample.status);
      if (to === "in_testing") {
        await run("Dikirim ke pengujian.", () => startTesting(sample.id));
      } else {
        await run("Dikirim ke verifikasi.", () => submitForVerify(sample.id));
      }
      return;
    }
    if (action.key === "verify") {
      await run("Diverifikasi.", () => verifySample(sample.id, user));
      return;
    }
    if (action.key === "approve") {
      await run("Disetujui.", () => approveSample(sample.id, user, action.override));
      return;
    }
    if (action.key === "reject") {
      if (!rejectReason.trim()) {
        setMessage("Alasan penolakan wajib diisi.");
        return;
      }
      await run("Ditolak.", () => rejectSample(sample.id, user, rejectReason));
    }
  }

  if (!sample) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Sampel"
          description={isLoading ? "Memuat sampel…" : "Detail tidak ditemukan."}
        />
        <Link href="/samples" className="text-sm text-[#16A34A] underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={sample.sampleNo}
        description={`${job?.jobNo ?? "Job"} · kode klien ${sample.sampleCode || "—"}`}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/samples")}>
            Kembali
          </Button>
        }
      />

      <SampleStatusBar sample={sample} user={user} busy={busy} onAction={onAction} />

      {sample.status === "pending_verify" || sample.status === "pending_approve" ? (
        <div className="space-y-1">
          <Label>Alasan tolak (wajib jika menekan Tolak)</Label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Alasan penolakan"
          />
        </div>
      ) : null}

      {sample.status === "expected" && user && ["admin", "sampler", "analyst"].includes(user.role) ? (
        <Panel title="Penerimaan">
          <Button
            className="bg-[#16A34A] hover:bg-[#14532D]"
            disabled={busy}
            onClick={async () => {
              await run("Sampel diterima.", () =>
                receiveSample(sample.id, safeIso(), form.receiveNotes),
              );
            }}
          >
            Terima sampel
          </Button>
        </Panel>
      ) : null}

      <Panel title={editable ? "Edit field bebas" : "Data sampel (terkunci)"}>
        {locked ? (
          <p className="mb-3 text-sm text-[#5d7266]">
            Status {sample.status}: field kritis terkunci. Lanjutkan lewat aksi status (Kirim / Verifikasi /
            Setujui / Tolak).
          </p>
        ) : (
          <p className="mb-3 text-sm text-[#5d7266]">
            Free edit hanya saat Diharapkan atau Diterima. Perubahan ditulis ke Supabase (bukan fixture)
            pada mode live.
          </p>
        )}
        <form
          ref={formRef}
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editable) return;
            await run("Perubahan disimpan.", () =>
              updateSampleFields(sample.id, {
                matrixId: form.matrixId,
                sampleCode: form.sampleCode,
                receiveNotes: form.receiveNotes,
                notes: form.notes,
                barcode: form.barcode,
                storageLocation: form.storageLocation,
                collectedAt: fromLocalInput(form.collectedAt),
              }),
            );
          }}
        >
          <div className="space-y-1">
            <Label>Kode sampel (sample_code)</Label>
            <Input
              disabled={!editable}
              value={form.sampleCode}
              onChange={(e) => setForm({ ...form, sampleCode: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Matriks</Label>
            <Select
              value={form.matrixId || undefined}
              onValueChange={(id) => setForm({ ...form, matrixId: id })}
              disabled={!editable}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {optionsForForm(data.matrices, [form.matrixId]).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Barcode</Label>
            <Input
              disabled={!editable}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Lokasi penyimpanan</Label>
            <Input
              disabled={!editable}
              value={form.storageLocation}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Waktu pengambilan (collected_at)</Label>
            <Input
              type="datetime-local"
              disabled={!editable}
              value={form.collectedAt}
              onChange={(e) => setForm({ ...form, collectedAt: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Catatan penerimaan (receive_notes)</Label>
            <Textarea
              disabled={!editable}
              value={form.receiveNotes}
              onChange={(e) => setForm({ ...form, receiveNotes: e.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Catatan (notes)</Label>
            <Textarea
              disabled={!editable}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {editable ? (
            <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
              Simpan field
            </Button>
          ) : null}
        </form>
        <dl className="mt-4 grid gap-2 text-sm text-[#5d7266] md:grid-cols-2">
          <div>
            Verifier: {staffName(data, sample.verifiedById)}
          </div>
          <div>
            Approver: {staffName(data, sample.approvedById)}
          </div>
          {sample.rejectReason ? <div className="md:col-span-2">Alasan tolak: {sample.rejectReason}</div> : null}
        </dl>
      </Panel>

      <Panel title="Hasil uji">
        {results.length === 0 ? (
          <p className="text-sm text-[#5d7266]">Belum ada hasil. Gunakan layar Pengujian.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.id}>
                {data.parameters.find((p) => p.id === r.parameterId)?.name ?? r.parameterId}: {r.result}
              </li>
            ))}
          </ul>
        )}
        <Link href="/testing" className="mt-2 inline-block text-sm text-[#16A34A] underline">
          Buka pengujian
        </Link>
      </Panel>

      {message ? <p className="text-sm text-[#14532D]">{message}</p> : null}
    </div>
  );
}
