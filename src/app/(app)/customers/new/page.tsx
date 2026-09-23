"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { nextCustomerCode } from "@/lib/domain/ids";
import { useLims } from "@/lib/store/lims-provider";

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, createCustomer, saveSite } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    npwp: "",
    billingAddress: "",
    phone: "",
    email: "",
    notes: "",
    siteName: "",
    siteAddress: "",
    siteCity: "",
    siteProvince: "",
  });

  if (!canWrite) {
    return <p className="text-sm text-[#5d7266]">Hanya Sales atau Admin yang boleh membuat customer.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer baru"
        description="Kode unik diisi otomatis jika dikosongkan. Setelah tersimpan, kode tidak bisa diubah."
        actions={
          <Button asChild variant="outline">
            <Link href="/customers">Kembali</Link>
          </Button>
        }
      />
      <Panel title="Data perusahaan">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage(null);
            const code = form.code.trim() || nextCustomerCode(data.customers.map((c) => c.code));
            const result = await createCustomer({
              code,
              name: form.name,
              npwp: form.npwp,
              billingAddress: form.billingAddress,
              phone: form.phone,
              email: form.email,
              notes: form.notes,
            });
            if (!result.ok) {
              setMessage(result.message);
              setBusy(false);
              return;
            }
            if (result.id && form.siteName.trim()) {
              const site = await saveSite({
                customerId: result.id,
                name: form.siteName,
                address: form.siteAddress,
                city: form.siteCity,
                province: form.siteProvince,
              });
              if (!site.ok) {
                setMessage(site.message);
                setBusy(false);
                router.push(`/customers/${result.id}`);
                return;
              }
            }
            setBusy(false);
            if (result.id) router.push(`/customers/${result.id}`);
          }}
        >
          <Field label="Kode">
            <Input
              placeholder="Otomatis jika kosong"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Field>
          <Field label="Nama perusahaan">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="NPWP">
            <Input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} />
          </Field>
          <Field label="Telepon">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Alamat billing">
              <Textarea
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Catatan">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2 pt-2 text-sm font-medium text-[#14532D]">
            Site pertama (disarankan)
          </div>
          <Field label="Nama site">
            <Input
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            />
          </Field>
          <Field label="Alamat site">
            <Input
              value={form.siteAddress}
              onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
            />
          </Field>
          <Field label="Kota">
            <Input value={form.siteCity} onChange={(e) => setForm({ ...form, siteCity: e.target.value })} />
          </Field>
          <Field label="Provinsi">
            <Input
              value={form.siteProvince}
              onChange={(e) => setForm({ ...form, siteProvince: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
              {busy ? "Menyimpan…" : "Simpan customer"}
            </Button>
          </div>
          {message ? <p className="md:col-span-2 text-sm text-[#b45309]">{message}</p> : null}
        </form>
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
