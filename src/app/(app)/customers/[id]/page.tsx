"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTimeId } from "@/lib/datetime";
import { sitesForCustomer } from "@/lib/domain/sites";
import { useLims } from "@/lib/store/lims-provider";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, updateCustomer, setCustomerActive, saveSite, saveContact } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const customer = data.customers.find((c) => c.id === params.id);
  const sites = useMemo(
    () => (customer ? sitesForCustomer(data.sites, customer.id) : []),
    [customer, data.sites],
  );
  const contacts = useMemo(
    () => data.contacts.filter((c) => c.customerId === customer?.id),
    [data.contacts, customer?.id],
  );
  const jobs = useMemo(
    () => data.jobs.filter((j) => j.customerId === customer?.id),
    [data.jobs, customer?.id],
  );

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    npwp: "",
    billingAddress: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [siteForm, setSiteForm] = useState({
    id: "",
    name: "",
    address: "",
    city: "",
    province: "",
    latitude: "",
    longitude: "",
  });
  const [contactForm, setContactForm] = useState({
    id: "",
    fullName: "",
    title: "",
    phone: "",
    email: "",
    isPrimary: false,
  });

  useEffect(() => {
    if (!customer) return;
    setForm({
      name: customer.companyName,
      npwp: customer.npwp,
      billingAddress: customer.address,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    });
  }, [customer]);

  if (!customer) {
    return (
      <p className="text-sm text-[#5d7266]">
        {isLoading ? "Memuat customer…" : "Customer tidak ditemukan."}{" "}
        <Link href="/customers" className="text-[#16A34A] underline">
          Kembali ke daftar
        </Link>
      </p>
    );
  }

  const editable = canWrite && customer.isActive;

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.companyName}
        description={`${customer.code || "Tanpa kode"} · ${customer.isActive ? "Aktif" : "Nonaktif"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/customers">Daftar</Link>
            </Button>
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await setCustomerActive(customer.id, !customer.isActive);
                  setBusy(false);
                  setMessage(res.ok ? (customer.isActive ? "Customer dinonaktifkan." : "Customer diaktifkan.") : res.message);
                }}
              >
                {customer.isActive ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5d7266]">
        <Badge
          variant="outline"
          className={customer.isActive ? "border-[#16A34A] text-[#14532D]" : "border-[#d5e4da]"}
        >
          {customer.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
        <span>Dibuat {formatDateTimeId(customer.createdAt)}</span>
        {customer.updatedAt ? <span>· Diperbarui {formatDateTimeId(customer.updatedAt)}</span> : null}
      </div>

      <Panel title="Data perusahaan">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editable) return;
            setBusy(true);
            const res = await updateCustomer(customer.id, {
              name: form.name,
              npwp: form.npwp,
              billingAddress: form.billingAddress,
              phone: form.phone,
              email: form.email,
              notes: form.notes,
            });
            setBusy(false);
            setMessage(res.ok ? "Customer disimpan." : res.message);
          }}
        >
          <Field label="Kode (tetap)">
            <Input disabled value={customer.code || "—"} />
          </Field>
          <Field label="Nama perusahaan">
            <Input
              required
              disabled={!editable}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="NPWP">
            <Input
              disabled={!editable}
              value={form.npwp}
              onChange={(e) => setForm({ ...form, npwp: e.target.value })}
            />
          </Field>
          <Field label="Telepon">
            <Input
              disabled={!editable}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              disabled={!editable}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Alamat billing">
              <Textarea
                disabled={!editable}
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Catatan">
              <Textarea
                disabled={!editable}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          {editable ? (
            <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
              Simpan perubahan
            </Button>
          ) : (
            <p className="text-sm text-[#5d7266]">
              {customer.isActive
                ? "Hanya Sales atau Admin yang dapat mengedit."
                : "Aktifkan customer untuk mengedit data."}
            </p>
          )}
        </form>
      </Panel>

      <Panel title="Sites">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Kota / Provinsi</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-[#5d7266]">
                  Belum ada site. Disarankan minimal satu sebelum membuat Job.
                </TableCell>
              </TableRow>
            ) : (
              sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.address || "—"}</TableCell>
                  <TableCell>
                    {[s.city, s.province].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSiteForm({
                            id: s.id,
                            name: s.name,
                            address: s.address,
                            city: s.city,
                            province: s.province,
                            latitude: s.latitude,
                            longitude: s.longitude,
                          })
                        }
                      >
                        Ubah
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {editable ? (
          <form
            className="mt-4 grid gap-2 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const res = await saveSite({
                id: siteForm.id || undefined,
                customerId: customer.id,
                name: siteForm.name,
                address: siteForm.address,
                city: siteForm.city,
                province: siteForm.province,
                latitude: siteForm.latitude,
                longitude: siteForm.longitude,
              });
              setBusy(false);
              if (res.ok) {
                setSiteForm({
                  id: "",
                  name: "",
                  address: "",
                  city: "",
                  province: "",
                  latitude: "",
                  longitude: "",
                });
                setMessage(siteForm.id ? "Site diperbarui." : "Site ditambahkan.");
              } else {
                setMessage(res.message);
              }
            }}
          >
            <Field label="Nama site">
              <Input
                required
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
              />
            </Field>
            <Field label="Alamat">
              <Input
                value={siteForm.address}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
              />
            </Field>
            <Field label="Kota">
              <Input value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} />
            </Field>
            <Field label="Provinsi">
              <Input
                value={siteForm.province}
                onChange={(e) => setSiteForm({ ...siteForm, province: e.target.value })}
              />
            </Field>
            <Field label="Latitude">
              <Input
                value={siteForm.latitude}
                onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                value={siteForm.longitude}
                onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
                {siteForm.id ? "Simpan site" : "Tambah site"}
              </Button>
              {siteForm.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSiteForm({
                      id: "",
                      name: "",
                      address: "",
                      city: "",
                      province: "",
                      latitude: "",
                      longitude: "",
                    })
                  }
                >
                  Batal
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}
      </Panel>

      <Panel title="Kontak">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Utama</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-[#5d7266]">
                  Belum ada kontak.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.fullName}</TableCell>
                  <TableCell>{c.title || "—"}</TableCell>
                  <TableCell>
                    {c.email || "—"}
                    <div className="text-xs text-[#5d7266]">{c.phone}</div>
                  </TableCell>
                  <TableCell>{c.isPrimary ? "Ya" : "—"}</TableCell>
                  <TableCell>
                    {editable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setContactForm({
                            id: c.id,
                            fullName: c.fullName,
                            title: c.title,
                            phone: c.phone,
                            email: c.email,
                            isPrimary: c.isPrimary,
                          })
                        }
                      >
                        Ubah
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {editable ? (
          <form
            className="mt-4 grid gap-2 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const makePrimary =
                contactForm.isPrimary ||
                (!contactForm.id && contacts.every((c) => !c.isPrimary));
              const res = await saveContact({
                id: contactForm.id || undefined,
                customerId: customer.id,
                fullName: contactForm.fullName,
                title: contactForm.title,
                phone: contactForm.phone,
                email: contactForm.email,
                isPrimary: makePrimary,
              });
              setBusy(false);
              if (res.ok) {
                setContactForm({
                  id: "",
                  fullName: "",
                  title: "",
                  phone: "",
                  email: "",
                  isPrimary: false,
                });
                setMessage(contactForm.id ? "Kontak diperbarui." : "Kontak ditambahkan.");
              } else {
                setMessage(res.message);
              }
            }}
          >
            <Field label="Nama lengkap">
              <Input
                required
                value={contactForm.fullName}
                onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
              />
            </Field>
            <Field label="Jabatan">
              <Input
                value={contactForm.title}
                onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
              />
            </Field>
            <Field label="Telepon">
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[#14532D]">
              <input
                type="checkbox"
                checked={contactForm.isPrimary}
                onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
              />
              Kontak utama (satu per customer)
            </label>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={busy} className="bg-[#16A34A] hover:bg-[#14532D]">
                {contactForm.id ? "Simpan kontak" : "Tambah kontak"}
              </Button>
              {contactForm.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setContactForm({
                      id: "",
                      fullName: "",
                      title: "",
                      phone: "",
                      email: "",
                      isPrimary: false,
                    })
                  }
                >
                  Batal
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}
      </Panel>

      <Panel title="Job terkait">
        {jobs.length === 0 ? (
          <p className="text-sm text-[#5d7266]">Belum ada job untuk customer ini.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="text-[#16A34A] underline">
                  {job.jobNo}
                </Link>
                <span className="text-[#5d7266]"> · {job.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {message ? <p className="text-sm text-[#14532D]">{message}</p> : null}
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
