# Flexy HRMS — Backend (NestJS Modular Monolith)

Backend untuk Flexy HRMS: modular monolith NestJS + Prisma + PostgreSQL.
Berjalan **tanpa Docker** (constraint: *tidak menggunakan docker*) — PostgreSQL
adalah satu-satunya datastore eksternal; job queue, event bus, dan audit log
semuanya berjalan di dalam PostgreSQL.

Lihat `docs/adr/0001-architecture-deviations.md` untuk catatan lengkap
setiap deviasi dari Technical Architecture Document (TAD).

## Status

- ✅ `npm install`, `prisma generate`, build, dan test suite sudah dijalankan
   (termasuk unit test Performance Management — semua lulus).
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

## Progress Epic

| Epic | Status |
|---|---|
| Epic 0 — Identity & Auth / Shared | ✅ Selesai |
| Epic 1 — Employee & Organization | ✅ Selesai |
| Epic 2 — Attendance & Leave | ✅ Selesai |
| Epic 3 — Payroll, BPJS, PPh 21 | ✅ Selesai |
| Epic 4 — Recruitment & Onboarding | ✅ Selesai |
| Epic 5 — Employee Self Service (ESS) | ✅ Selesai |
| Epic 6 — System Administration | ✅ Selesai |
| **Epic 7 — Performance Management** | ✅ **Selesai** (US-01 s.d. US-05, BR-01/02/03, FR-01 s.d. FR-06) |
| **Epic 8 — Employee Movement** | ✅ **Selesai** (US-01 s.d. US-04, BR-02, FR-01 s.d. FR-07) |
| **Epic 9 — Expense/Claim Loan Management** | ✅ **Selesai** (`@Permissions` pada 9 expense + 7 loan endpoints, `LOAN_DISBURSED` event, BR-02 cicilan capacity validation) |
| **Epic 10 — Asset Management** | ✅ **Selesai** (`@Permissions` pada 11 asset + 3 canonical endpoints, seed permissions + role grants) |
| **Epic 11 — Benefit Management** | ✅ **Selesai** (`@Permissions` pada 10 benefit + 4 eligibility-rule endpoints, seed permissions + role grants) |
| **Epic 12 — Learning Management** | ✅ **Selesai** (`@Permissions` pada training & certification endpoints, seed permission `learning:read`) |
| **Epic 13 — Resignation & Offboarding** | ✅ **Selesai** (`@Permissions` pada 16 resignation + 6 canonical endpoints, seed permissions + role grants, exit interview + offboarding task flow) |
| **Epic 14 — Analytics & BI** | ✅ **Selesai** (`@Permissions('analytics:read')` pada 14 endpoints, seed permission + role grants untuk HR/Manager/Employee) |

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
npm run test        # unit test (semua lulus)
npm run test:e2e    # e2e test (semua lulus)
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
6. **Epic 7 — Performance Management BR-01**: final scores (`FinalScore`) hanya bisa dibuat sekali. Setelah cycle COMPLETED, semua FinalScore terkunci — tidak ada endpoint update; hubungi appeal (di luar skop modul ini) untuk perubahan.
7. **Epic 7 — Performance Management BR-02**: goal yang dibuat setelah >50% periode cycle berjalan secara otomatis diset `approvalRequired=true`. Goal tidak aktif (`NOT_STARTED`) hingga HRBP menyetujui via `PUT /performance/goals/:id/approve`.
8. **Epic 7 — Performance Management BR-03**: peer feedback dianonimkan: jika `reviewerId !== employeeId` dan viewer bukan reviewer itu sendiri, `reviewerId` diset `null` di response. Manager/direct-report belum dibedakan (tidak ada `managerId` di model `Employment`).
9. **Epic 7 — Performance Management FR-05/event**: `performance.score.finalized` diterbitkan hanya oleh `CalibrationService.finalize` (bukan `CycleService.complete`), mematuhi kontrak event Outbox (`eventBus.publishTypedViaOutbox` dalam transaksi Prisma yang sama).
10. **Epic 8 — Employee Movement US-04/FR-07**: `GET /employees/:id/movement-history` di-route via controller terpisah `MovementHistoryController` dengan base `employees` (bukan `employees/movements`), konsisten dengan `PerformanceController` yang juga punya base `employees`.
11. **Epic 8 — Employee Movement FR-06/event**: `employee.grade.changed` diterbitkan oleh `MovementService.approve` saat posisi baru memiliki `gradeId` berbeda dengan posisi sebelumnya (promosi/demosi). Event dipublish via `eventBus.publishTyped` setelah transaksi Prisma selesai (belum via Outbox — gap untuk hardening).
12. **Epic 8 — Employee Movement BR-02**: tanggal efektif tidak boleh sebelum `new Date().toDateString()` (retroaktif). Pemeriksaan dilakukan di `MovementService.create`.
13. **Epic 8 — Employee Movement BR-04/cross-entity**: persetujuan Finance untuk mutasi lintas entitas belum diimplementasikan — memerlukan orchestration dengan Workflow Engine yang tersedia (gap).
14. **Epic 9 — Expense BR-02**: cicilan capacity validation — `installmentAmount ≤ 30% × netPay` dari payslip terakhir. Jika belum ada payslip, validasi dilewati (tidak ditolak).
15. **Epic 9 — Loan FR-06/event**: `LOAN_DISBURSED` diterbitkan oleh `LoanService.approve` saat pinjaman disetujui (event sebelumnya tidak ada). `LOAN_INSTALLMENT_DUE` per cicilan sudah ada sebelumnya.
16. **Epic 9 — Expense/Loan `@Permissions`**: semua CRUD endpoint expense (9) dan loan (7) dilindungi dengan permission granular (`expense-claims:create/read/update/approve/pay`, `loans:create/read/approve`). Seed mencakup grant per-role (HR full, Manager approve/read, Employee create/read).
17. **Epic 10/11/12/13 — `@Permissions` pattern**: semua endpoint CRUD asset/benefit/learning/resignation dilindungi dengan permission string `module:action`. Seed mencakup role-appropriate grants: HR (full CRUD/approve), Manager (read/approve), Employee (self-service create/read).
18. **Epic 14 — Analytics `@Permissions`**: semua 14 endpoint analytics menggunakan satu permission `analytics:read` (consistent dengan matrix PRD — Eksekutif, Finance, HRBP/HR Manager semua read-only). Seed grants untuk HR, Manager, dan Employee.

## Referensi

1. `docs/adr/0001-architecture-deviations.md` — deviasi arsitektur & status
2. `DEPLOYMENT.md` — panduan deploy (PM2, tanpa Docker)
3. `apps/web/README.md` — frontend Next.js
