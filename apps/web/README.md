# Flexy HRMS Web (Next.js 14)

Frontend untuk Flexy HRMS — Next.js 14 (App Router) yang memanggil backend
NestJS via REST `/api/v1`. Seluruh data-fetching sudah menggunakan **TanStack
Query** (React Query); tidak ada lagi `useEffect` + `useState` untuk fetch data
primer.

## Stack

- Next.js 14, React 18, TypeScript (strict)
- **TanStack Query** (`@tanstack/react-query`) + Devtools — lihat
  `lib/query-provider.tsx` (QueryClientProvider) dan `lib/query-keys.ts`
  (factory query-key ter-tipe).
- Tailwind CSS v3 + komponen UI kustom di `components/ui/`.
- Client-side auth via `localStorage` + React context (`lib/auth.tsx`):
  token (`flexy.accessToken`) & tenant (`flexy.tenantId`).
- Thin API client (`lib/api.ts`) yang menyuntikkan header `Authorization`
  bearer dan `x-tenant-id` di setiap request.

## Environment

Salin `.env.local.example` ke `.env.local`:

```
NEXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
```

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

## Struktur data-fetching

- **Provider:** `lib/query-provider.tsx` dibungkus di dalam `AuthProvider` pada
  `app/layout.tsx` (staleTime 30s, retry 1, tanpa refetch-on-focus).
- **Hooks:** 23 hook TanStack Query di `hooks/` (mis. `use-employees`,
  `use-dashboard`, `use-payroll`, `use-admin`, …) — satu hook per domain.
- **Query keys:** `lib/query-keys.ts` menyediakan factory `queryKeys.<domain>.*`
  untuk invalidate yang konsisten.
- **Mutasi:** create/update/delete menggunakan `useMutation` + invalidasi query
  key terkait.

## Halaman (58+ route)

Semua layar modul sudah ada dan terhubung ke API, di antaranya:

- Dashboard, profil & preferensi, learning (trainings/certifications)
- Employees (list, detail, baru, import, organisasi, **movements**)
- Attendance (absensi, overtime, shifts), Leaves, Expenses, Loans, Assets
- Benefits (+ **eligibility-rules**), Payroll (runs, components, BPJS, tax,
  bank-transfers, salary-components), Payslips
- Performance (cycles, calibrations, goals, reviews, scorecards, requisitions)
- Recruitment (candidates, jobs, applications, onboarding), Resignations
- Admin (roles, tenants, audit-logs, workflows, **feature-flags**,
  **integrations**), Analytics

## Flow

1. `/login` — masukkan tenant id, email, password → `POST /api/v1/admin/auth/login`.
2. Sukses → token + tenant disimpan; route ke `/dashboard`.
3. Navigasi terproteksi; setiap halaman mengambil data lewat hook TanStack Query.
4. Logout memanggil endpoint logout dan membersihkan sesi.

## Catatan

- API base & header tenant dikonfigurasi di `lib/api.ts` (default tenant
  `"default"` — lihat ADR-0001 Decision 2).
- `useEffect` yang tersisa hanya untuk sinkronisasi form-state (bukan fetch data
  primer), mis. `salary-components`, `goals/[id]`, `reviews/[id]`,
  `profile/preferences`.
