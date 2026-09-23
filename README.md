# PCS LIMS

Sistem Informasi Laboratorium (LIMS) untuk laboratorium lingkungan **PCS Laboratory** — bukan sistem perpustakaan.

Happy path MVP (job-first):

Job Order → Sample receive → hasil multi-parameter → Verify (user A) → Approve (user B) → LHU record → Invoice stub

Quotation penuh dan PDF/QR LHU **di luar MVP**. Layar Quotation tetap “Segera hadir”.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## Login demo (mock auth)

Supabase belum wajib. Session cookie `pcs-lims-session`. Kata sandi: `pcs-demo`.

| Peran | Email | Menu |
| --- | --- | --- |
| Admin | etik@pcs-lab.id | Semua |
| Sales / CS | rina@pcs-lab.id | Dashboard, Customer, Quotation, Job Order, Invoice |
| Sampler | andri@pcs-lab.id | Dashboard, Sampling, Sample Tracking |
| Analyst | dewi@pcs-lab.id | Dashboard, Sample Tracking, Pengujian |
| Verifier | budi@pcs-lab.id | Dashboard, Verifikasi & Approval, LHU, Sample Tracking |
| Approver | sari@pcs-lab.id | Dashboard, Verifikasi & Approval, LHU, Sample Tracking |
| Finance | hendra@pcs-lab.id | Dashboard, Invoice, Job Order |

Ganti peran dari header (tanpa kehilangan data lokal) untuk dual control.

## Data fixture

State operasional disimpan di `localStorage` (`pcs-lims-data-v2`) lewat `LimsProvider`. Seed ada di `src/lib/fixtures/seed.ts`. Hook (`useAuth`, `useDashboardStats`, `useLims`) siap diganti klien Supabase. Reset dari Master Data → **Reset data demo**.

## Enum status LOCKED

**Job:** `draft` · `scheduled` · `sampling` · `received` · `testing` · `verification` · `approval` · `lhu_ready` · `lhu_issued` · `invoiced` · `closed` · `cancelled`

**Sample:** `expected` · `received` · `in_testing` · `pending_verify` · `pending_approve` · `approved` · `rejected` · `archived`

**LHU:** `draft` · `issued` · `superseded`

**Invoice:** `unpaid` · `paid` · `void`

Nomor: Job `PCS-YYMMDD-NNN`, Sample `PCS-S-YYMMDD-NNN`. Matriks seed: Air Limbah, Air Bersih, Udara Ambient, Emisi, Lingkungan Kerja.

## Dual control

Verify lalu Approve **harus dua user berbeda**. Approver yang sama dengan verifier ditolak. Admin boleh override (Approve dari `pending_verify`) dan ditulis ke `auditLogs`. Tombol mockup Review = Verify.

## Demo happy path

1. Masuk sebagai **Admin** atau **Sales** — buat Job, jadwalkan.
2. **Sampler** — jadwal sampling, buat Sample ID, **Terima sampel** (waktu + catatan kondisi).
3. **Analyst** — isi beberapa baris parameter, simpan, kirim verifikasi.
4. **Verifier** — Verify.
5. Ganti ke **Approver** — Approve.
6. Approver/Admin — terbitkan record LHU.
7. **Finance** — buat invoice stub (unpaid), tandai lunas.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
