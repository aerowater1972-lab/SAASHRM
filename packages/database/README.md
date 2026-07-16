# Flexy HRMS — Database Package

Paket Prisma (`@flexy-hrms/database`) berisi `schema.prisma` (skema multi-tenant
lengkap) dan skrip seed.

## Skrip yang tersedia

| Script | Perintah | Keterangan |
|---|---|---|
| Generate client | `npm run db:generate` | Generate `@prisma/client` dari `schema.prisma` |
| Migrasi | `npm run db:migrate` | `prisma migrate dev` |
| Push schema | `npm run db:push` | Sinkronkan skema ke DB tanpa migrasi |
| Seed utama | `npm run db:seed` | Jalankan `prisma db seed` (permission catalog + sample `default` tenant) |
| **Seed demo** | `npm run db:seed:demo` | **Buat data demo PT Nusantara Sejahtera Makmur** |

## Demo Data — PT Nusantara Sejahtera Makmur

Skrip `seed-demo-nusantara.ts` membuat data demo realistis untuk **satu
perusahaan fiktif Indonesia** di tenant terpisah agar tidak menimpa data seed
`default` atau katalog permission.

### Menjalankan

```powershell
# pastikan DATABASE_URL mengarah ke DB yang sama dengan aplikasi
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/flexy_hrms"
npm run db:seed:demo
```

Atau langsung via ts-node:

```powershell
../node_modules/.bin/ts-node ./seed-demo-nusantara.ts
```

> Catatan: skrip dijalankan dengan ts-node; warning
> `[MODULE_TYPELESS_PACKAGE_JSON]` bersifat kosmetik dan tidak memengaruhi
> hasil seed.

### Akun login demo (tenant `nusantara`)

Skrip juga membuat **role** (`System Administrator`, `HR Admin`, `Manager`,
`Employee`) dan **user login** untuk tenant `nusantara` agar data bisa
dilihat melalui aplikasi (UI/API). Password semua akun demo: **`Demo123!`**

| Email | Role | Keterangan |
|---|---|---|
| `admin@nusantarasejahtera.co.id` | System Administrator | Akses penuh tenant demo |
| `maya.sari@nusantarasejahtera.co.id` | HR Admin | Di-link ke emp `NSM-2024-007` |
| `budi.santoso@nusantarasejahtera.co.id` | Employee | Di-link ke emp `NSM-2024-001` (Direktur Utama) |

Login via `POST /api/v1/admin/auth/login` dengan header `x-tenant-id: nusantara`.
Setelah login, token membawa `tenantId=nusantara` sehingga `GET /employees`,
`GET /organizations`, `GET /departments`, dll. menampilkan data demo.

> Catatan: `GET /employees` secara default menyembunyikan karyawan
> `PENDING_ACTIVATION` (4 orang). Gunakan filter `?status=PENDING_ACTIVATION`
> atau query DB langsung untuk melihat ke-4 karyawan tersebut (demonstrasi BR-08).

### Keputusan pemodelan: `Employee.tenantId` vs `TenantEntity`

Skema `Employee.tenantId` adalah FK ke `TenantEntity.id`, tetapi layer service
memfilter employee berdasarkan **string tenant id** (dari JWT). Agar data demo
TERLIHAT via API, skrip membuat `TenantEntity` dengan `id == tenant id`
(`nusantara`), sehingga `employee.tenantId = 'nusantara'` memuaskan sekaligus FK
maupun filter query API. Ini menyelaraskan dengan cara kerja API yang ada.

### Ringkasan isi data

- **Tenant**: `nusantara` — domain `nusantara-sejahtera.flexyhrms.demo`
  (entity `entity-nusantara`, tempat `employee.tenantId` merujuk).
- **Struktur organisasi**: 7 organization (1 root + 6 divisi) → 10 department
  (GA & Legal, HR, Finance & Accounting, IT, Sales & Marketing, Customer
  Service, Produksi, QC, Gudang & Logistik, Keamanan/Satpam).
- **Grade**: 8 level (Staff=1 … Direktur=8).
- **Position**: 34 posisi tersebar per department.
- **Shift**: 7 shift (Kantor Reguler, Produksi 1/2/3, Gudang Reguler, Satpam
  Siang/Malam) — mencerminkan praktik jam kerja Indonesia (termasuk shift malam
  & pola 12 jam satpam).
- **Karyawan**: **48 orang** dengan nama Indonesia beragam (Jawa/Sunda/Batak/
  Minang, dll), tersebar tenure 1–10 tahun, gaji bervariasi per grade.
  - **4 karyawan berstatus `PENDING_ACTIVATION`** (hasil recruitment, `startDate`
    masa depan) untuk mendemokan BR-08 (transisi otomatis saat masa kerja dimulai).
  - Setiap karyawan memiliki `Employment`, `EmployeeContact` (telepon, alamat,
    kontak darurat keluarga fiktif), dan `EmployeeMedical` (hanya `bloodType`,
    `allergies`/`notes` dikosongkan / placeholder "Tidak ada riwayat khusus").
- **Roster**: 1 roster bulan berjalan dengan **176 RosterEntry** — tiap karyawan
  aktif dijadwalkan ke shift sesuai departemennya (operator produksi dirotasi
  merata ke 3 shift; satpam dirotasi siang/malam). Karyawan `PENDING_ACTIVATION`
  tidak dibuat roster-nya.

### Idempotensi

Skrip melakukan `deleteMany` untuk **seluruh baris milik tenant demo**
(`nusantara` / `entity-nusantara`) di awal, lalu meng-insert ulang. Pola ini
dipilih (bukan upsert per-row) agar re-run berulang aman tanpa duplikasi dan
selalu menghasilkan snapshot data yang konsisten. Semua id demo di-prefix
`nsm-` agar tidak bentrok dengan id seed `default` (mis. `dept-hr`, `org-it`).

### Catatan model Shift / Roster

Model `Shift` dan `Roster`/`RosterEntry` **sudah ada** di `schema.prisma`
sebagai preview minimal untuk kebutuhan demo data. Implementasi penuh Epic 2
(Attendance & Leave: clock-in/out, leave request, overtime) tetap mengikuti
proses Epic Kickoff Prompt terpisah — skrip ini HANYA mengisi master shift &
roster, tidak membuat `AttendanceRecord`/`LeaveRequest`.

### Karantina data pribadi

Seluruh nama, NIK, NPWP, nomor telepon, dan alamat bersifat **fiktif** dan hanya
untuk demo. Email menggunakan domain demo `nusantarasejahtera.co.id` (bukan
domain nyata).
