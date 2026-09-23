"use client";

import { useMemo, useState } from "react";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import type { MasterInput, MasterKind } from "@/lib/store/context";
import { useLims } from "@/lib/store/lims-provider";

const TABS: { key: MasterKind; label: string }[] = [
  { key: "matrices", label: "Matriks" },
  { key: "methods", label: "Metode" },
  { key: "parameters", label: "Parameter" },
];

const EMPTY: MasterInput = {
  code: "",
  name: "",
  description: "",
  standardRef: "",
  unit: "",
  methodId: "",
  matrixId: "",
  loq: "",
  bakuMutu: "",
  isActive: true,
};

export default function AdminMasterPage() {
  const { user } = useAuth();
  const { data, saveMaster, setMasterActive, mode, resetDemo } = useLims();
  const [tab, setTab] = useState<MasterKind>("matrices");
  const [form, setForm] = useState<MasterInput>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (tab === "matrices") return data.matrices;
    if (tab === "methods") return data.methods;
    return data.parameters;
  }, [data.matrices, data.methods, data.parameters, tab]);

  if (user?.role !== "admin") {
    return <p className="text-sm text-[#5d7266]">Hanya Admin yang dapat membuka master data.</p>;
  }

  function startEdit(id: string) {
    if (tab === "matrices") {
      const row = data.matrices.find((item) => item.id === id);
      if (!row) return;
      setForm({
        ...EMPTY,
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        isActive: row.isActive,
      });
    } else if (tab === "methods") {
      const row = data.methods.find((item) => item.id === id);
      if (!row) return;
      setForm({
        ...EMPTY,
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        standardRef: row.standardRef,
        isActive: row.isActive,
      });
    } else {
      const row = data.parameters.find((item) => item.id === id);
      if (!row) return;
      setForm({
        ...EMPTY,
        id: row.id,
        code: row.code,
        name: row.name,
        unit: row.unit ?? "",
        methodId: row.methodId,
        matrixId: row.matrixId,
        loq: row.loq,
        bakuMutu: row.bakuMutu,
        isActive: row.isActive,
      });
    }
    setMessage(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin — Master data"
        description="Kelola matriks, metode, dan parameter. Nonaktifkan baris yang sudah dipakai — hapus keras tidak tersedia."
        actions={
          mode === "fixtures" ? (
            <Button variant="outline" onClick={resetDemo}>
              Reset data demo
            </Button>
          ) : null
        }
      />
      <AdminSubnav />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? "default" : "outline"}
            className={tab === item.key ? "bg-[#16A34A] hover:bg-[#14532D]" : ""}
            onClick={() => {
              setTab(item.key);
              setForm(EMPTY);
              setMessage(null);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Panel title={form.id ? `Ubah ${TABS.find((t) => t.key === tab)?.label}` : `Tambah ${TABS.find((t) => t.key === tab)?.label}`}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!form.code.trim() || !form.name.trim()) {
              setMessage("Kode dan nama wajib diisi.");
              return;
            }
            const res = await saveMaster(tab, form, user.id);
            setMessage(res.ok ? "Tersimpan." : res.message);
            if (res.ok) setForm(EMPTY);
          }}
        >
          <Field label="Kode">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </Field>
          <Field label="Nama">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          {tab === "methods" ? (
            <Field label="Acuan standar">
              <Input
                value={form.standardRef ?? ""}
                onChange={(e) => setForm({ ...form, standardRef: e.target.value })}
              />
            </Field>
          ) : null}
          {tab === "parameters" ? (
            <>
              <Field label="Satuan (teks)">
                <Input
                  value={form.unit ?? ""}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="mg/L"
                />
              </Field>
              <Field label="Metode">
                <Select
                  value={form.methodId || undefined}
                  onValueChange={(id) => setForm({ ...form, methodId: id })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.methods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.code ? `${method.code} — ${method.name}` : method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Matriks">
                <Select
                  value={form.matrixId || undefined}
                  onValueChange={(id) => setForm({ ...form, matrixId: id })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih matriks" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.matrices.map((matrix) => (
                      <SelectItem key={matrix.id} value={matrix.id}>
                        {matrix.code ? `${matrix.code} — ${matrix.name}` : matrix.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="LOQ">
                <Input
                  value={form.loq ?? ""}
                  onChange={(e) => setForm({ ...form, loq: e.target.value })}
                />
              </Field>
              <Field label="Baku mutu">
                <Input
                  value={form.bakuMutu ?? ""}
                  onChange={(e) => setForm({ ...form, bakuMutu: e.target.value })}
                />
              </Field>
            </>
          ) : (
            <div className="md:col-span-2">
              <Field label="Deskripsi">
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" className="bg-[#16A34A] hover:bg-[#14532D]">
              Simpan
            </Button>
            {form.id ? (
              <Button type="button" variant="outline" onClick={() => setForm(EMPTY)}>
                Batal
              </Button>
            ) : null}
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-[#14532D]">{message}</p> : null}
      </Panel>

      <Panel title={`Daftar ${TABS.find((t) => t.key === tab)?.label}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              {tab === "methods" ? <TableHead>Acuan</TableHead> : null}
              {tab === "parameters" ? (
                <>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Matriks</TableHead>
                </>
              ) : (
                <TableHead>Deskripsi</TableHead>
              )}
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-[#5d7266]">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const parameter = tab === "parameters" ? data.parameters.find((item) => item.id === row.id) : undefined;
                const method = tab === "methods" ? data.methods.find((item) => item.id === row.id) : undefined;
                const matrix = tab === "matrices" ? data.matrices.find((item) => item.id === row.id) : undefined;
                const methodName = parameter
                  ? data.methods.find((item) => item.id === parameter.methodId)?.name
                  : "";
                const matrixName = parameter
                  ? data.matrices.find((item) => item.id === parameter.matrixId)?.name
                  : "";
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    {tab === "methods" ? <TableCell>{method?.standardRef || "—"}</TableCell> : null}
                    {tab === "parameters" ? (
                      <>
                        <TableCell>{parameter?.unit || "—"}</TableCell>
                        <TableCell>{methodName || "—"}</TableCell>
                        <TableCell>{matrixName || "—"}</TableCell>
                      </>
                    ) : (
                      <TableCell className="max-w-[220px] truncate">
                        {matrix?.description || method?.description || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        className={
                          row.isActive
                            ? "border-transparent bg-[#e7f4ec] text-[#14532D]"
                            : "border-transparent bg-[#f3f4f3] text-[#5d7266]"
                        }
                      >
                        {row.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(row.id)}>
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const res = await setMasterActive(tab, row.id, !row.isActive, user.id);
                            setMessage(res.ok ? (row.isActive ? "Dinonaktifkan." : "Diaktifkan.") : res.message);
                          }}
                        >
                          {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </TableCell>
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
