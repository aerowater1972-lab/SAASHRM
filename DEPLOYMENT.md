# Flexy HRMS — Deployment Guide

Target: run the NestJS backend on a single Linux/Windows host **without Docker**
(project constraint: _tidak menggunakan docker_). Uses PM2 for process management
and PostgreSQL as the only external datastore (the job queue and events run inside
PostgreSQL — see `docs/adr/0001-architecture-deviations.md`).

## 1. Prerequisites

- Node.js **20+** (developed on 25.2.0)
- PostgreSQL **18** (or compatible 15+), reachable from the app host
- A `flexy_hrms` database created
- `npm` 10+

> Redis is **not** required — the job queue (`JobQueue` table) and event bus run
> on PostgreSQL.

## 2. Install

```bash
npm install          # postinstall runs `prisma generate`
```

## 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set at minimum:

- `DATABASE_URL` — e.g.
  `postgresql://user:pass@localhost:5432/flexy_hrms?schema=public`
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — long random strings
- `PORT`, `CORS_ORIGIN` as needed

See `apps/api/.env.example` for the full list (all have safe defaults).

## 4. Database migration & seed

Development (creates migration history):

```bash
npm run db:migrate    # prisma migrate dev
npm run db:seed       # loads default tenant, org, admin user, sample data
```

Production (apply existing migrations without generating new ones):

```bash
npx prisma migrate deploy --schema=packages/database/schema.prisma
npm run db:seed
```

The seed creates the default tenant (`default`), an admin user
(`admin@flexy.local` / `admin123`), and reference data. **Change the admin
password after first login.**

## 5. Build

```bash
npm run build         # builds apps/api -> apps/api/dist
```

## 5.1 Frontend (Next.js)

Frontend berada di `apps/web` (Next.js 14, App Router) dan berkomunikasi dengan
backend via `NEXT_PUBLIC_API_BASE` (default `http://localhost:3000/api/v1`).

```bash
cd apps/web
cp .env.local.example .env.local      # set NEXT_PUBLIC_API_BASE
npm install
npm run build                         # -> apps/web/.next
```

Cara menjalankan di produksi (pilih salah satu):

- **Node server (disarankan untuk SSR):**
  ```bash
  cd apps/web
  pm2 start "npm run start -- -p 3001" --name flexy-hrms-web
  ```
- **Static export** (jika tidak butuh SSR): tambahkan `output: 'export'` di
  `next.config.js`, lalu serve folder `out/` via Nginx/static host apa pun.

Pastikan reverse proxy (Nginx) meneruskan traffic `/api/*` ke backend (port 3000)
dan menyuntikkan/memvalidasi header `x-tenant-id` untuk klien eksternal (lihat
§10). Contoh Nginx:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header x-tenant-id $http_x_tenant_id;
}
location / {
  proxy_pass http://127.0.0.1:3001;   # Next.js
}
```

## 6. Run with PM2

From `apps/api`:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup           # optional: auto-restart on boot
```

- `name`: `flexy-hrms-api`
- `script`: `dist/main.js`, cluster mode (`instances: max`)
- graceful shutdown via `kill_timeout: 30000`

## 7. Health checks

Both endpoints are public (no auth) and live under the global `/api/v1` prefix:

- `GET /api/v1/health` — liveness (`{ status: "ok", uptime, timestamp }`)
- `GET /api/v1/health/ready` — readiness, includes DB connectivity
  (`{ status: "ok"|"error", dependencies: { database } }`)

Use `/api/v1/health/ready` for load-balancer / process-manager health probes.

## 8. Logging & monitoring

- Application logs: `pm2 logs flexy-hrms-api`
- API docs (Swagger/OpenAPI): `http://<host>:<PORT>/api/docs`
- An `openapi.json` is written to the app working directory on boot.
- Recommended (not yet wired): ship logs to a central aggregator and add
  Prometheus metrics using the `/api/v1/health` endpoint as a baseline.

## 9. Backup

PostgreSQL is the only stateful component. Schedule a daily dump:

```bash
# Using helper script (reads DATABASE_URL from apps/api/.env)
scripts/backup.sh

# Or manually:
pg_dump --format=custom --no-owner --compress=9 \
  postgresql://user:pass@localhost:5432/flexy_hrms \
  > backup/flexy_hrms_$(date +%F).dump
```

Restore with `pg_restore`:

```bash
scripts/restore.sh backup/flexy_hrms_20260713_120000.dump
```

The `JobQueue` and `Notification` tables are also backed up by this dump.

## 10. Multi-tenancy note

Tenant isolation is enforced at the application layer by the `x-tenant-id`
header (default `"default"`). There is **no** PostgreSQL Row-Level Security yet —
see ADR-0001 Decision 2. Ensure the reverse proxy / API gateway forwards and
validates `x-tenant-id` for external clients.

## 11. CI/CD

Continuous integration runs via GitHub Actions (`.github/workflows/ci.yml`) on
every push/PR to `main`. It has three jobs:

| Job       | What it does                                                                 |
|-----------|------------------------------------------------------------------------------|
| `backend` | `npm ci` → `prisma generate` → lint → **unit tests** (`npm test -w apps/api`, 180+ specs) → `nest build`. |
| `frontend`| `npm ci` → **`next build`** for `apps/web`.                                    |
| `e2e`     | Spins up a PostgreSQL 18 service, runs `prisma db push` + `db:seed`, then runs the API e2e specs (`npm run test:e2e -w apps/api`). |

Required CI secrets / env (the `e2e` job sets them inline for the service DB):

- `DATABASE_URL` — point at the Postgres service, e.g.
  `postgresql://postgres:postgres@localhost:5432/flexy_hrms?schema=public`
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — any non-empty value for the test run.

The repo uses **npm workspaces** (no pnpm/turbo), so the workflow uses `npm ci`.
The backend unit-test command relies on the `--localstorage-file` flag in
`apps/api`'s `test` script; this is handled inside the script and needs no
extra setup.

### Optional: Docker

The root `Dockerfile` builds the API image with npm workspaces (multi-stage).
This is optional — the primary, supported deployment path is PM2 + Nginx
(§5.1 / §6) per the project's no-Docker constraint. Build & run:

```bash
docker build -t flexy-hrms-api .
docker run -e DATABASE_URL=postgresql://user:pass@host:5432/flexy_hrms -e JWT_SECRET=... -p 3000:3000 flexy-hrms-api
```

To run the whole stack (API + Postgres) you can also use `docker-compose.yml`
after setting `DATABASE_URL` accordingly.

## 12. Salary encryption at rest (opt-in)

`Employment.salary` can be stored encrypted (AES-256-GCM) instead of plaintext.
The `salary_enc` column already exists; the Prisma middleware in
`apps/api/src/common/prisma/prisma.service.ts` encrypts on write and decrypts
on read when enabled. To enable:

```bash
# 1. Set a 32+ char key (server refuses to boot in production without it)
DATA_ENCRYPTION_KEY="<32+ random chars>"
# 2. Backfill existing plaintext salaries into salary_enc, then
#    verify reads return identical values on a non-prod copy first
# 3. Enable the middleware
SALARY_ENCRYPTION_ENABLED="true"
```

Keep the flag OFF until step 2 is verified; enabling with an empty key fails
closed. NIK/NPWP/BPJS/bank/medical fields are still plaintext (see DB-005) —
do not treat this flag as full PII encryption.

## 13. RPO / RTO targets

| Item | Target |
|---|---|
| Backup cadence | Daily (`scripts/backup.sh` via cron/systemd timer) |
| Retention | 30 days (`BACKUP_RETENTION_DAYS`, `0` = keep all) |
| RPO | ≤ 24 h (last daily dump) |
| RTO | ≤ 4 h (provision → `scripts/restore.sh --force` → `migrate deploy` → smoke) |
| Restore drill | Quarterly on a scratch DB; record result in `BackupRecord` |

Non-interactive restore for automation: `scripts/restore.sh --force <file>`
(verifies the archive with `pg_restore --list` before touching the database).
