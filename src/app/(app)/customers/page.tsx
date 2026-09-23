"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLims } from "@/lib/store/lims-provider";

export default function CustomersPage() {
  const { user } = useAuth();
  const { data, upsertCustomer, upsertSite } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(data.customers[0]?.id ?? null);
  const [form, setForm] = useState({
    companyName: "",
    pic: "",
    email: "",
    phone: "",
    address: "",
  });
  const [siteForm, setSiteForm] = useState({ name: "", address: "" });

  const customers = useMemo(
    () =>
      data.customers.filter((c) =>
        `${c.companyName} ${c.pic}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.customers, query],
  );
  const sites = data.sites.filter((s) => s.customerId === selectedId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer"
        description="Perusahaan, PIC/HSE, dan lokasi sampling (site)."
      />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Daftar customer">
          <Input
            className="mb-3"
            placeholder="Cari perusahaan / PIC"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perusahaan</TableHead>
                <TableHead>PIC / HSE</TableHead>
                <TableHead>Kontak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-[#5d7266]">
                    Tidak ada customer.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className={selectedId === c.id ? "bg-[#e7f4ec]" : "cursor-pointer"}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell className="font-medium">{c.companyName}</TableCell>
                    <TableCell>{c.pic}</TableCell>
                    <TableCell>
                      {c.email}
                      <div className="text-xs text-[#5d7266]">{c.phone}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Panel>

        <div className="space-y-4">
          {canWrite ? (
            <Panel title="Tambah / perbarui customer">
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const id = upsertCustomer(form);
                  setSelectedId(id);
                  setForm({ companyName: "", pic: "", email: "", phone: "", address: "" });
                }}
              >
                <Field label="Nama perusahaan">
                  <Input
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </Field>
                <Field label="PIC / HSE">
                  <Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                  <Field label="Telepon">
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </Field>
                </div>
                <Field label="Alamat perusahaan">
                  <Textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
                <Button type="submit" className="bg-[#1f8a4c] hover:bg-[#146338]">
                  Simpan Customer
                </Button>
              </form>
            </Panel>
          ) : null}

          <Panel title="Site / lokasi sampling">
            {selectedId ? (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama site</TableHead>
                      <TableHead>Alamat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-[#5d7266]">
                          Belum ada site.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sites.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.address}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {canWrite ? (
                  <form
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      upsertSite({ customerId: selectedId, ...siteForm });
                      setSiteForm({ name: "", address: "" });
                    }}
                  >
                    <Input
                      required
                      placeholder="Nama site"
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                    />
                    <Input
                      required
                      placeholder="Alamat site"
                      value={siteForm.address}
                      onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                    />
                    <Button type="submit" className="bg-[#1f8a4c] hover:bg-[#146338]">
                      Tambah site
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[#5d7266]">Pilih customer untuk melihat site.</p>
            )}
          </Panel>
        </div>
      </div>
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
