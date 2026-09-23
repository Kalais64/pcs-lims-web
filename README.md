# PCS LIMS

Sistem Informasi Laboratorium (LIMS) untuk laboratorium lingkungan **PCS Laboratory**.

Happy path MVP (job-first):

Job Order → Sample receive → hasil multi-parameter → Verify (user A) → Approve (user B) → LHU record → Invoice stub

Quotation penuh dan PDF/QR LHU **di luar MVP**. Layar Quotation tetap “Segera hadir”.

## Mode data

| Kondisi | Perilaku |
| --- | --- |
| `NEXT_PUBLIC_USE_FIXTURES=true` | Demo lokal: cookie session + `localStorage` (`pcs-lims-data-v2`) |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tanpa flag fixture) | **Live** — baca tabel + tulis status lewat RPC `transition_*` |
| Env belum ada | UI tidak crash; data kosong + banner |

Jangan taruh `SUPABASE_SERVICE_ROLE_KEY` atau `DATABASE_URL` di kode browser. Hanya anon key + RLS.

Salin `.env.example` ke `.env.local`. Vercel project `pcs-lims` sudah punya public env.

## Auth live vs fixture

**Live:** `signInWithPassword` (Supabase Auth). Peran = `profiles.role` di mana `profiles.id = auth.uid()`. Role switcher **dimatikan** — mengganti peran di UI tidak mengubah JWT/`auth.uid()`, dan tidak boleh dipakai untuk lolos dual control.

**Fixture (QA lokal):** cookie `pcs-lims-session` + akun demo (`pcs-demo`). Role switch hanya di mode ini.

### Mapping yang Backend harus sediakan

Buat user Auth + baris `profiles` (atau `staff_profiles`) dengan `id` = UUID Auth:

| Peran | Email saran (seed) |
| --- | --- |
| admin | etik@pcs-lab.id |
| sales | rina@pcs-lab.id |
| sampler | andri@pcs-lab.id |
| analyst | dewi@pcs-lab.id |
| verifier | budi@pcs-lab.id |
| approver | sari@pcs-lab.id |
| finance | hendra@pcs-lab.id |

Dual control: **dua akun berbeda** (verifier ≠ approver). Admin override lewat RPC `transition_sample(..., override)` dan harus masuk `audit_logs`.

## Status (LOCKED)

**Job:** `draft` · `scheduled` · `sampling` · `received` · `testing` · `verification` · `approval` · `lhu_ready` · `lhu_issued` · `invoiced` · `closed` · `cancelled`

**Sample:** `expected` · `received` · `in_testing` · `pending_verify` · `pending_approve` · `approved` · `rejected` · `archived`

**LHU:** `draft` · `issued` · `superseded`

**Invoice:** `unpaid` · `paid` · `void`

Status berubah lewat RPC bernama (bukan UPDATE status mentah):

```ts
supabase.rpc("transition_job", { p_id, p_to, p_reason, p_override })
supabase.rpc("transition_sample", { p_id, p_to, p_reason, p_override })
supabase.rpc("transition_lhu", { p_id, p_to, p_reason, p_lhu_number })
supabase.rpc("transition_invoice", { p_id, p_to, p_reason })
```

`p_override: true` hanya untuk admin override (teraudit). Dual control: verify ≠ approve harus dua `auth.uid()` berbeda.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
# isi URL + anon, atau set NEXT_PUBLIC_USE_FIXTURES=true
npm run dev
```

```bash
npm run build
npm start
```

## Verifikasi happy path (live)

1. Masuk sebagai sales/admin Auth yang punya `profiles`.
2. Buat customer + site + job, jadwalkan (`transition_job` → `scheduled`).
3. Sampler: jadwal sampling, buat sample, terima (`transition_sample` → `received`).
4. Analyst: multi-parameter, simpan (`in_testing`), kirim verifikasi (`pending_verify`).
5. Verifier: Verify (`pending_approve`).
6. **Keluar, masuk akun Approver lain** — Approve (`approved`).
7. Approver/admin: terbitkan record LHU (`transition_lhu` → `issued`).
8. Finance: invoice stub unpaid, `transition_invoice` → `paid`.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Postgres + RLS).
