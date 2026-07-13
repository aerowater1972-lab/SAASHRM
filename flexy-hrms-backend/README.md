# Flexy HRMS — Backend (NestJS Modular Monolith)

Backend untuk Flexy HRMS: modular monolith NestJS + Prisma + PostgreSQL.
Berjalan **tanpa Docker** (constraint: *tidak menggunakan docker*) — PostgreSQL
adalah satu-satunya datastore eksternal; job queue, event bus, dan audit log
semuanya berjalan di dalam PostgreSQL.

Lihat `docs/adr/0001-architecture-deviations.md` untuk catatan lengkap
setiap deviasi dari Technical Architecture Document (TAD).

## Status

- ✅ `npm install`, `prisma generate`, build, dan test suite sudah dijalankan
  (181 unit test + 23 e2e test — semua lulus).
- ✅ TypeScript `strict` mode diaktifkan.
- ✅ 14 modul terimplementasi (lihat di bawah), termasuk Workflow Engine generik
  dan RBAC granular.
- ✅ Frontend Next.js sudah tersedia (lihat `apps/web/README.md`).

## Stack

- Node.js **20+** (dikembangkan di 25.2.0), npm 11+
- NestJS 10, PostgreSQL 18 (kompatibel 15+)
- Prisma 6 sebagai ORM; multi-tenant via kolom `tenantId` (bukan RLS)
- JWT + bcrypt untuk autentikasi; RBAC granular per modul via guard & decorator
- Job queue & event bus berbasis tabel PostgreSQL (bukan Redis/BullMQ)

## Modul

| Modul | Tanggung jawab utama |
|---|---|
| `shared` | Infrastruktur lintas modul: `PrismaService`, `TenantContext`, health check, **Workflow Engine**, `JobQueue` (PostgreSQL), Event Bus + Outbox, Notification |
| `admin` | System Administration: tenant, role & permission, audit log, workflow definitions, feature flag, integration hub |
| `employee` | Employee & organization: pegawai, employment history, pergerakan/mutasi (`/employees/movements`) |
| `attendance` | Absensi, lembur (overtime), shift |
| `leave` | Cuti & saldo cuti |
| `expense` | Klaim expense + approval workflow |
| `loan` | Pinjaman karyawan + cicilan |
| `asset` | Aset & penugasan aset |
| `benefit` | Benefit, komponen gaji, aturan eligibilitas (`/benefits/eligibility-rules`) |
| `payroll` | Payroll run, komponen gaji, BPJS, PPh21/tax, bank transfer (CSV) |
| `performance` | Siklus performance, kalibrasi, goal/OKR, review, scorecard, requisition |
| `recruitment` | Kandidat, lowongan (jobs), aplikasi, onboarding & dokumen |
| `resignation` | Pengunduran diri + offboarding |
| `learning` | Pelatihan (trainings) & sertifikasi (certifications) |
| `ess` | Employee Self Service: preferensi, notifikasi ESS |
| `analytics` | Dashboard & agregat analitik |

> Catatan: `shared` bukan modul bisnis — ia menampung service infrastruktur
> (@Global) yang digunakan modul lain.

## Autentikasi & Otorisasi

- Login: `POST /api/v1/admin/auth/login` → mengembalikan JWT.
- Setiap request memerlukan header `Authorization: Bearer <token>` dan
  `x-tenant-id` (default `"default"`).
- RBAC granular: guard `AuthGuard` + `PermissionGuard` memeriksa permission
  (`module:action`) dari role user (di-embed di JWT). Decorator `@Public()`
  untuk endpoint tanpa auth (health, login).
- Tidak ada service `/authz/check` terpisah — pemeriksaan otorisasi dilakukan
  in-process via guard (lihat ADR-0001 Decision 4).

## Struktur Folder

```
apps/api/
├── src/
│   ├── common/                 # Infrastruktur lintas modul
│   │   ├── decorators/         # @RequirePermission, @CurrentUser, @Public
│   │   ├── guards/             # AuthGuard, PermissionGuard
│   │   ├── prisma/             # PrismaService + PrismaModule (@Global)
│   │   └── ...
│   ├── modules/
│   │   ├── shared/             # workflow engine, job queue, event bus, health
│   │   ├── admin/              # tenants, roles, audit, workflows, feature-flag, integrations
│   │   ├── employee/           # employees, movements
│   │   ├── attendance/         # attendance, overtime, shifts
│   │   ├── leave/
│   │   ├── expense/
│   │   ├── loan/
│   │   ├── asset/
│   │   ├── benefit/            # benefits, eligibility-rules
│   │   ├── payroll/            # runs, components, bpjs, tax, bank-transfers
│   │   ├── performance/        # cycles, calibrations, goals, reviews, scorecards, requisitions
│   │   ├── recruitment/        # candidates, jobs, applications, onboarding
│   │   ├── resignation/
│   │   ├── learning/           # trainings, certifications
│   │   ├── ess/                # preferences, notifications
│   │   └── analytics/
│   ├── app.module.ts
│   └── main.ts
└── test/                       # e2e tests
packages/database/
├── schema.prisma               # semua model tenant-scoped
└── seed.ts
scripts/seed.js                 # seed default tenant, org, admin, sample data
```

## Menjalankan di lokal

```bash
# dari root monorepo
npm install                       # postinstall menjalankan prisma generate
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# sinkronisasi skema (dev) — lihat DEPLOYMENT.md untuk opsi migrate vs push
npx prisma db push --schema=packages/database/schema.prisma --accept-data-loss
npm run db:seed                   # node scripts/seed.js

npm run dev                       # nest start --watch, port 3000
# buka http://localhost:3000/api/docs (Swagger) dan /api/v1/health
```

> Tidak ada `docker compose`. Redis/BullMQ **tidak** digunakan — job queue &
> event bus berjalan di PostgreSQL (ADR-0001 Decision 1).

## Test

```bash
npm run test        # 181 unit test (semua lulus)
npm run test:e2e    # 23 e2e test (semua lulus)
npm run test:cov    # dengan coverage
```

## Keputusan Desain Penting (ringkasan — detail di ADR-0001)

1. **Job queue PostgreSQL, bukan Redis/BullMQ** — `JobQueue` table + poll loop
   (`PgJobQueueService` + `JobWorkerService`), tetap bisa di-swap ke BullMQ nanti.
2. **Multi-tenant di app-layer** — semua query di-scope `tenantId` via
   `TenantContext`; RLS belum diadopsi (perlu test isolasi sebelum customer eksternal).
3. **Workflow Engine generik (@Global)** — `WorkflowEngineService` adalah otoritas
   tunggal transisi approval legal (10 definisi workflow terdaftar). Konsumsi sudah
   di-wire ke Expense/Loan/Resignation/Leave; sisanya siap saat transisi status
   diimplementasikan di masing-masing service.
4. **Otorisasi via guard, bukan `/authz/check`** — pemeriksaan in-process, latensi
   rendah di modular monolith.
5. **Bounded context di-hardening** — akses data `employee` lintas modul wajib lewat
   `EmployeeService` (tidak ada `prisma.employee` langsung di luar modul employee).

## Referensi

1. `docs/adr/0001-architecture-deviations.md` — deviasi arsitektur & status
2. `DEPLOYMENT.md` — panduan deploy (PM2, tanpa Docker)
3. `apps/web/README.md` — frontend Next.js
