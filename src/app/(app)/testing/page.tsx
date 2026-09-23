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
import { useAuth } from "@/lib/hooks/use-auth";
import { nowIso } from "@/lib/domain/ids";
import { useLims } from "@/lib/store/lims-provider";

type Row = {
  parameterId: string;
  methodId: string;
  unitId: string;
  result: string;
};

export default function TestingPage() {
  const { user } = useAuth();
  const { data, saveResults, submitForVerify } = useLims();
  const [sampleId, setSampleId] = useState(
    data.samples.find((s) => ["received", "in_testing", "rejected"].includes(s.status))?.id ??
      data.samples[0]?.id ??
      "",
  );
  const [message, setMessage] = useState<string | null>(null);

  const sample = data.samples.find((s) => s.id === sampleId);
  const existing = data.results.filter((r) => r.sampleId === sampleId);

  const initialRows: Row[] = useMemo(() => {
    if (existing.length) {
      return existing.map((r) => ({
        parameterId: r.parameterId,
        methodId: r.methodId,
        unitId: r.unitId,
        result: r.result,
      }));
    }
    return data.parameters.slice(0, 4).map((p, i) => ({
      parameterId: p.id,
      methodId: data.methods[i]?.id ?? data.methods[0]?.id ?? "",
      unitId: p.unit || data.units[0]?.id || "",
      result: "",
    }));
  }, [sampleId, data.parameters, data.methods, existing.length]);

  const [rows, setRows] = useState<Row[]>(initialRows);

  function reloadRows(id: string) {
    const found = data.results.filter((r) => r.sampleId === id);
    if (found.length) {
      setRows(
        found.map((r) => ({
          parameterId: r.parameterId,
          methodId: r.methodId,
          unitId: r.unitId,
          result: r.result,
        })),
      );
    } else {
      setRows(
        data.parameters.slice(0, 4).map((p, i) => ({
          parameterId: p.id,
          methodId: data.methods[i]?.id ?? data.methods[0]?.id ?? "",
          unitId: p.unit || data.units[0]?.id || "",
          result: "",
        })),
      );
    }
  }

  const testable = data.samples.filter((s) =>
    ["received", "in_testing", "rejected"].includes(s.status),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengujian"
        description="Worksheet multi-parameter: parameter, metode, hasil, satuan."
      />
      <Panel title="Pilih sampel">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Sampel</Label>
            <Select
              value={sampleId}
              onValueChange={(id) => {
                setSampleId(id);
                reloadRows(id);
                setMessage(null);
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.samples.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sampleNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sample ? <StatusBadge entity="sample" status={sample.status} /> : null}
          {sample?.rejectReason ? (
            <p className="text-sm text-red-600">Ditolak: {sample.rejectReason}</p>
          ) : null}
        </div>
      </Panel>

      <Panel title="Baris hasil uji">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-4">
              <Select
                value={row.parameterId}
                onValueChange={(id) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, parameterId: id } : r)))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Parameter" />
                </SelectTrigger>
                <SelectContent>
                  {data.parameters.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={row.methodId}
                onValueChange={(id) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, methodId: id } : r)))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  {data.methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Hasil"
                value={row.result}
                onChange={(e) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, result: e.target.value } : r)))
                }
              />
              <Select
                value={row.unitId}
                onValueChange={(id) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, unitId: id } : r)))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Satuan" />
                </SelectTrigger>
                <SelectContent>
                  {data.units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows([
                ...rows,
                {
                  parameterId: data.parameters[0]?.id ?? "",
                  methodId: data.methods[0]?.id ?? "",
                  unitId: data.units[0]?.id ?? "",
                  result: "",
                },
              ])
            }
          >
            + Tambah parameter
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-[#16A34A] hover:bg-[#14532D]"
              onClick={async () => {
                if (!user) return;
                const res = await saveResults(
                  sampleId,
                  rows.map((r) => ({
                    ...r,
                    analystId: user.id,
                    testedAt: nowIso(),
                  })),
                  user.id,
                );
                setMessage(res.ok ? "Hasil disimpan." : res.message);
              }}
              disabled={!testable.some((s) => s.id === sampleId)}
            >
              Simpan hasil
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const res = await submitForVerify(sampleId);
                setMessage(res.ok ? "Dikirim ke verifikasi." : res.message);
              }}
            >
              Kirim ke verifikasi
            </Button>
          </div>
          {message ? <p className="text-sm text-[#14532D]">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
