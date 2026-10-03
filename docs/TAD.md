# Flexy HRMS — Technical Architecture Document (TAD)

## 1. Architecture Overview

Flexy HRMS is a **modular monolith** built with:
- **Backend**: NestJS 10 (TypeScript 5.9 strict, Node 25)
- **ORM**: Prisma 6 + PostgreSQL 18
- **Frontend**: Next.js 14 (app router), Tailwind CSS 3, TanStack Query 5
- **Auth**: JWT + bcrypt, RBAC granular via NestJS guards
- **Multi-tenancy**: Application-layer via `x-tenant-id` header (not RLS)
- **Workflow Engine**: @Global generic engine for approval transitions
- **Job Queue**: PostgreSQL table-based (PgJobQueueService + JobWorkerService)
- **Event Bus**: PostgreSQL outbox pattern (EventBusService + EventOutbox)
- **CI/CD**: GitHub Actions (3 jobs: backend unit → frontend build → e2e with Postgres service)

### 1.1 Deployment Constraint
No Docker. Production runs via PM2 + Nginx. PostgreSQL is the single external datastore.

### 1.2 Ports
- API: `localhost:3000`
- Database: `localhost:5432` (PostgreSQL 18, db `flexy_hrms`)

---

## 2. Module Catalog & Feature Checklist

### 2.1 Shared (`modules/shared/`)
| Komponen | File | Status |
|----------|------|--------|
| PrismaService (@Global) | `common/prisma/prisma.service.ts` | ✅ |
| WorkflowEngineService (@Global) | `workflow/workflow-engine.service.ts` | ✅ |
| 10 workflow definitions registered | `workflow/workflow.definitions.ts` | ✅ |
| JobQueue (PgJobQueueService) | `events/pg-job-queue.service.ts` | ✅ |
| JobWorker (poll + handler registry) | `jobs/job-worker.service.ts` | ✅ |
| EventBus + Outbox | `events/event-bus.service.ts`, `events/outbox.service.ts` | ✅ |
| AuditEventService | `events/audit-event.service.ts` | ✅ |
| HealthController | `health/health.controller.ts` | ✅ |
| Pagination utility | `common/prisma/pagination.util.ts` | ✅ |
| PaginationQueryDto | `common/dto/pagination-query.dto.ts` | ✅ |
| AuthGuard, PermissionGuard | `common/guards/` | ✅ |
| Tenant decorator, CurrentUser decorator | `common/decorators/` | ✅ |

### 2.2 Admin (`modules/admin/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Login/Register | `auth.controller.ts` | `auth.service.ts` | ✅ |
| Tenant CRUD | `tenant.controller.ts` | `tenant.service.ts` | ✅ |
| Role CRUD + permission assign | `role.controller.ts` | `role.service.ts` | ✅ |
| User Management CRUD + activate/deactivate/reset-password | `user-management.controller.ts` | `user-management.service.ts` | ✅ |
| Bulk CSV Import employees | `bulk-import.controller.ts` | `bulk-import.service.ts` | ✅ |
| Audit log | `audit.controller.ts` | `audit.service.ts` | ✅ |
| Workflow definitions | `workflow.controller.ts` | `workflow.service.ts` | ✅ |
| Feature flags | `feature-flag.controller.ts` | `feature-flag.service.ts` | ✅ |
| Integrations | `integration.controller.ts` | `integration.service.ts` | ✅ |

### 2.3 Employee (`modules/employee/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Employee CRUD + soft-delete | `employee.controller.ts` | `employee.service.ts` | ✅ |
| Employment history | `employment.controller.ts` | `employment.service.ts` | ✅ |
| Movement/mutasi | `movement.controller.ts` | `movement.service.ts` | ✅ |
| Organization (Dept/Position/Grade) | `organization.controller.ts` | `organization.service.ts` | ✅ |
| Pagination (server-side) | — | — | ✅ |
| Search by name/email/employeeId | — | — | ✅ |

### 2.4 Attendance (`modules/attendance/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Clock in/out | `attendance.controller.ts` | `attendance.service.ts` | ✅ |
| Attendance records | `attendance.controller.ts` | `attendance.service.ts` | ✅ |
| Attendance corrections | `attendance.controller.ts` | `attendance.service.ts` | ✅ |
| Leave CRUD + balance | `leave.controller.ts` | `leave.service.ts` | ✅ |
| Leave approve/reject (Workflow Engine) | — | — | ✅ |
| Overtime requests | `overtime.controller.ts` | `overtime.service.ts` | ✅ |
| Shift CRUD | `shift.controller.ts` | `shift.service.ts` | ✅ |
| Roster management | `shift.controller.ts` | `shift.service.ts` | ✅ |
| Holiday calendar | `shift.controller.ts` | `shift.service.ts` | ✅ |
| Pagination | — | — | ✅ |

### 2.5 Expense (`modules/expense/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Expense claim CRUD (w/ items) | `expense.controller.ts` | `expense.service.ts` | ✅ |
| Submit/Pending → DRAFT transition | — | — | ✅ |
| Approve/Reject via Workflow Engine | — | — | ✅ |
| Pay (APPROVED → PAID) | — | — | ✅ |
| Loan CRUD + installments | `loan.controller.ts` | `loan.service.ts` | ✅ |
| Loan approve via Workflow Engine | — | — | ✅ |
| Pagination + filter (status, date, q) | — | — | ✅ |

### 2.6 Payroll (`modules/payroll/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Payroll run CRUD | `run.controller.ts` | `run.service.ts` | ✅ |
| Run lifecycle (DRAFT→PENDING→APPROVED→PAID) | — | — | ✅ |
| Payroll components | `component.controller.ts` | `component.service.ts` | ✅ |
| Payroll periods | `period.controller.ts` | `period.service.ts` | ✅ |
| BPJS config | `bpjs.controller.ts` | `bpjs.service.ts` | ✅ |
| Tax config | `tax.controller.ts` | `tax.service.ts` | ✅ |
| Salary components per employee | `salary-component.controller.ts` | — | ✅ |
| Payslip | `payslip.controller.ts` | `payslip.service.ts` | ✅ |
| Bank transfer (CSV) | `bank-transfer.controller.ts` | — | ✅ |
| Pagination | — | — | ✅ |

### 2.7 Performance (`modules/performance/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Review cycles CRUD | `cycle.controller.ts` | `cycle.service.ts` | ✅ |
| Goals/OKRs CRUD | `goal.controller.ts` | `goal.service.ts` | ✅ |
| Goal progress updates | — | — | ✅ |
| Performance reviews | `review.controller.ts` | `review.service.ts` | ✅ |
| Submission & approval | — | — | ✅ |
| Calibration sessions | `calibration.controller.ts` | — | ✅ |
| Pagination | — | — | ✅ |

### 2.8 Recruitment (`modules/recruitment/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Job postings CRUD | `job-posting.controller.ts` | `job-posting.service.ts` | ✅ |
| Job requisitions | `requisition.controller.ts` | — | ✅ |
| Candidate CRUD | `candidate.controller.ts` | `candidate.service.ts` | ✅ |
| Applications | `application.controller.ts` | `application.service.ts` | ✅ |
| Interview + scorecards | `interview-scorecard.controller.ts` | — | ✅ |
| Offers | — | — | ✅ |
| Onboarding documents | `onboarding-document.controller.ts` | `onboarding.service.ts` | ✅ |
| Convert candidate → employee | — | `candidate.service.ts` | ✅ |
| Pagination | — | — | ✅ |

### 2.9 Asset (`modules/asset/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Asset CRUD | `asset.controller.ts` | `asset.service.ts` | ✅ |
| Asset assignment | — | — | ✅ |
| Pagination | — | — | ✅ |

### 2.10 Benefit (`modules/benefit/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Benefit CRUD | `benefit.controller.ts` | `benefit.service.ts` | ✅ |
| Benefit enrollment | — | — | ✅ |
| Eligibility rules | `eligibility-rule.controller.ts` | — | ✅ |
| Pagination | — | — | ✅ |

### 2.11 Resignation (`modules/resignation/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Resignation request CRUD | `resignation.controller.ts` | `resignation.service.ts` | ✅ |
| Approve/reject via Workflow Engine | — | — | ✅ |
| Exit interview | — | — | ✅ |
| Offboarding tasks | — | — | ✅ |
| Pagination | — | — | ✅ |

### 2.12 Learning (`modules/learning/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Training CRUD | `training.controller.ts` | `training.service.ts` | ✅ |
| Training participants | — | — | ✅ |
| Certifications CRUD | `certification.controller.ts` | `certification.service.ts` | ✅ |
| Pagination | — | — | ✅ |

### 2.13 Employee Relations & Safety (`modules/employee-relations/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Violation Category CRUD | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| Disciplinary Case / SP (BR-01 escalation) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| SP approve (BR-02) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| SP digital acknowledgment (FR-04) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| BR-05 auto-escalation unacknowledged SP (>3 days) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| Incident Report CRUD (FR-06/FR-07) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| PPE Assignment CRUD (FR-08/FR-09) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| PPE expire | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| K3 Dashboard (FR-10) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| K3 Training Compliance per dept (FR-11) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| Training recommendations by violation category | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| Employee K3 profile (trainings + APD) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| BR-04 PPE clock-in guard check | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| Branding upsert (see §2.16) | `employee-relations.controller.ts` | `employee-relations.service.ts` | ✅ |
| ESS Notifications for SP/Incident | `employee-relations.controller.ts` | — (PrismaService) | ✅ |
| Unit tests | — | `employee-relations.service.spec.ts` | ✅ (16 cases) |
| Web pages (6 routes) | — | — | ✅ |
| Audit logging on all mutation endpoints | — | — | ✅ |
| CSV export (dashboard, incident, PPE) | — | — | ✅ |

### 2.14 Branding (`modules/admin/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| TenantBranding CRUD | `branding.controller.ts` | `employee-relations.service.ts` | ✅ |
| BrandingInjector (CSS vars on :root) | `BrandingInjector` component | - | ✅ Fixed localStorage key bug (used `flexy.auth.token`, now `flexy.accessToken`) |
| Admin page (color picker + live swatch) | — | — | ✅ |
| Tailwind `brand` colors + globals.css defaults | — | — | ✅ |

### 2.15 Platform Operations (`modules/admin/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| System health snapshot (latest) | `platform.controller.ts` | — (PrismaService) | ✅ |
| Simulated health ping | `platform.controller.ts` | — (PrismaService) | ✅ |
| System Health web page (7 metric cards) | — | — | ✅ |
| Snapshot button | — | — | ✅ |

### 2.16 ESS (`modules/ess/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Employee profile | `profile.controller.ts` | `profile.service.ts` | ✅ |
| Attendance (ESS view) | `attendance-ess.controller.ts` | — | ✅ |
| Leave (ESS view + apply) | `leave-ess.controller.ts` | — | ✅ |
| Payslip (ESS view) | `payslip-ess.controller.ts` | — | ✅ |
| Dashboard (includes K3 profile) | `dashboard.controller.ts` | `dashboard.service.ts` | ✅ |
| Preferences | `preference-ess.controller.ts` | — | ✅ |
| Notifications (SP/Incident alerts) | `notification-ess.controller.ts` | — | ✅ |
| K3 & Disciplinary self-service | `profile.controller.ts` (EssK3Controller) | — (PrismaService) | ✅ |
| BR-04 PPE guard on clock-in | `dashboard.controller.ts` | — (frontend) | ✅ |

### 2.17 Analytics (`modules/analytics/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Dashboard aggregations | `analytics.controller.ts` | `analytics.service.ts` | ✅ |
| Filter by period/entity | — | — | ✅ |

### 2.18 Engagement Survey (`modules/engagement-survey/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Survey CRUD | `engagement-survey.controller.ts` | `engagement-survey.service.ts` | ✅ |
| Template questions (ENPS/PULSE auto-populate) (FR-01) | — | `engagement-survey.service.ts` | ✅ |
| Anonymous response mode + BR-01 lock on edit | — | `engagement-survey.service.ts` | ✅ |
| Target scope by department/grade (FR-02) | — | `engagement-survey.service.ts` | ✅ |
| Survey fill/submit via ESS (FR-03) | — | `engagement-survey.service.ts` | ✅ |
| Notification on survey published (FR-03) | — | `engagement-survey.service.ts` | ✅ |
| Results aggregation with min respondent threshold (BR-02) (FR-05) | — | `engagement-survey.service.ts` | ✅ |
| Action items CRUD (FR-06) | — | `engagement-survey.service.ts` | ✅ |
| eNPS trend over time | — | `engagement-survey.service.ts` | ✅ |
| Web pages (6 routes): list, create/edit, detail, results, action-items | — | — | ✅ |
| Survey fill page (ESS) | — | — | ✅ |
| Sidebar navigation (admin + ESS) | — | — | ✅ |
| Filter by type, status, date range | — | — | ✅ |
| Audit logging | — | — | ✅ |

### 2.19 Manpower Planning (`modules/manpower-planning/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Plan CRUD | `manpower-planning.controller.ts` | `manpower-planning.service.ts` | ✅ |
| Salary range auto-estimate from grade (FR-03) | — | `manpower-planning.service.ts` | ✅ |
| Version auto-increment on update (FR-06) | — | `manpower-planning.service.ts` | ✅ |
| Submit for approval via Workflow Engine (FR-02) | — | `manpower-planning.service.ts` | ✅ |
| Multi-step approval (HR → Finance → Final) via Workflow Engine | — | `manpower-planning.service.ts` | ✅ |
| Auto-create job requisitions on final approval (FR-04) | — | `manpower-planning.service.ts` | ✅ |
| Plan vs Actual (linked requisitions) | — | `manpower-planning.service.ts` | ✅ |
| Link requisition to plan item | — | `manpower-planning.service.ts` | ✅ |
| Web pages (6 routes): list, create/edit, detail, submit, approve, plan-vs-actual | — | — | ✅ |
| Sidebar navigation | — | — | ✅ |
| Filter by department, period, status | — | — | ✅ |
| Audit logging | — | — | ✅ |

---

## 3. Cross-Cutting Concerns

### 3.1 Authentication & Authorization
| Aspek | Detail |
|-------|--------|
| Method | JWT (access + refresh token) |
| Login | `POST /api/v1/admin/auth/login` — `{ email, password }` + `x-tenant-id` header |
| Guard chain | `AuthGuard` (token validation) → `PermissionGuard` (RBAC check via `@Permissions()` decorator) |
| Permission format | `module:action` (e.g., `expense-claims:approve`) |
| JWT payload | `sub`, `email`, `tenantId`, `employeeId`, `permissions[]` |
| Access token expiry | 15m (configurable) |
| Refresh token expiry | 7d |

### 3.2 Multi-Tenancy
- Enforced at application layer (not RLS)
- Every tenant-scoped model has `tenantId String` column
- `TenantContext` / `@TenantId()` decorator resolves `x-tenant-id` header
- Default tenant: `"default"`
- Tenant (system) vs TenantEntity (organizational unit)

### 3.3 Workflow Engine
- `@Global` `WorkflowEngineService` — single authority on legal transitions
- 12 registered definitions: `expense`, `loan`, `resignation`, `leave`, `benefit-enrollment`, `performance-review`, `performance-goal`, `payroll-run`, `training`, `onboarding`, `overtime`, `manpower-plan`
- `transition(key, fromState, action)` returns `{ from, action, to }` or throws `BadRequestException`
- All definitions currently wired to their owning services

### 3.4 Pagination
| Aspek | Detail |
|-------|--------|
| Approach | Server-side pagination (opt-in via `page` query param) |
| DTO | `PaginationQueryDto` — `page`, `limit`, `q`, `sortBy`, `sortDir` |
| Util | `paginate()` — returns `{ data, total, page, pageSize }` when `page` sent, legacy array otherwise |
| Frontend | `useServerTable<T>` hook (TanStack Query `keepPreviousData`) |
| Applied to | All 16 list pages in frontend + all 16 list endpoints in backend |

### 3.5 Job Queue & Event Bus
- **Job queue**: PostgreSQL `JobQueue` table, polled by `JobWorkerService`
- **Handlers**: Registration via `JobHandlerRegistry`, retry with exponential backoff
- **Event bus**: `EventBusService.publish()` → `EventOutbox` table → polled by `JobWorkerService`
- **Audit**: `AuditEventService` records audit events

### 3.6 CI/CD
| Aspek | Detail |
|-------|--------|
| Provider | GitHub Actions (`.github/workflows/ci.yml`) |
| Jobs | (1) Backend unit tests → (2) Frontend build → (3) e2e tests (PostgreSQL 18 service + `db:seed`) |
| Docker | Optional via `Dockerfile` (npm workspaces-based) |
| Deploy target | PM2 + Nginx (non-Docker) |

---

## 4. Known Gaps & Technical Debt

| # | Gap | Module | Priority | Notes |
|---|-----|--------|----------|-------|
| 1 | TS strict DTOs reformatted to 4-space; Prettier restore done (2026-07-13) | all DTOs | Closed | ✅ ADR-0001 Decision 5 resolved |
| 2 | DI fix: WorkflowEngineService missing in benefit/training test mocks (2026-07-13) | benefit, learning | Closed | ✅ Unit tests passing |
| 3 | No RLS — multi-tenancy at app-layer only | cross-cutting | Low | Acceptable until external tenants onboarded |
| 4 | Rate limiting on login endpoint | admin | Closed | ✅ `@Throttle` added (2026-07-13) |
| 5 | No background job for payroll run (sync processing) | payroll | Medium | Payroll run is synchronous; async via JobQueue is future work |
| 6 | No SMS/WhatsApp notification channel | shared/notifications | Low | Email-only (Nodemailer) |
| 7 | No API versioning beyond `/api/v1/` | cross-cutting | Low | Single version sufficient for now |
| 8 | No OpenAPI/Swagger `@ApiResponse` on most endpoints | all | Low | Only basic Swagger decorators exist |
| 9 | ESS list endpoints (leave, attendance, payslip, notifications) tidak pakai server-side pagination | ess | Low | Personal views — pagination less critical, data terbatas per user |
| 10 | Backup/restore script in repo | devops | Closed | ✅ `scripts/backup.sh` + `scripts/restore.sh` created (2026-07-13) |
| 11 | No monitoring/alerting config | devops | Low | Future work |
| 12 | Certification pagination fix | learning | Closed | ✅ Fixed (2026-07-13) |
| 13 | Employee Relations & Safety modul belum ada di TAD sebelumnya | docs | Closed | ✅ Ditambahkan §2.13 (2026-07-26) |
| 14 | Branding + Platform Operations modul belum ada di TAD sebelumnya | docs | Closed | ✅ Ditambahkan §2.14–§2.15 (2026-07-26) |
| 15 | BrandingInjector localStorage key salah (`flexy.auth.token` → `flexy.accessToken`) | frontend | Closed | ✅ Fixed (2026-07-26) |
| 16 | role-employee.isSystem salah (true→false) pada seed | seed | Closed | ✅ Fixed di seed.ts, seed-demo-nusantara.ts, dan DB manual (2026-07-26) |
| 17 | TenantBranding seed data tidak ter-sync dengan seed utama dan demo seed | seed | Closed | ✅ Added to `seed.ts` dan `seed-demo-nusantara.ts` (2026-07-26) |
| 18 | Admin branding page (FR-17) belum dibangun — color picker, logo upload, live preview | frontend | Medium | Akan dikerjakan setelah mobile ESS ADR diputuskan |
| 19 | User Management page (admin/users) belum ada di frontend | frontend | Closed | ✅ Built (2026-07-26) |
| 20 | Import CSV (FR-04) halaman belom dibangun | frontend | Closed | ✅ Built — upload, parse, preview, column mapping, bulk import (2026-07-26) |
| 21 | Workflow Designer step editing (FR-05) — tombol Simpan Alur dinonaktifkan | frontend | Closed | ✅ Enabled — step add/edit/delete sekarang functional (2026-07-26) |
| 22 | AI Copilot (FR-06) — butuh keputusan Mobile ESS ADR | frontend | Blocked | ⏳ Tergantung ADR mobile ESS |
| 23 | Engagement Survey module belum ada di TAD sebelumnya | docs | Closed | ✅ Ditambahkan §2.18 (2026-07-28) |
| 24 | Manpower Planning module belum ada di TAD sebelumnya | docs | Closed | ✅ Ditambahkan §2.19 (2026-07-28) |
| 25 | FR-01: Template questions gap (ENPS/PULSE) | backend | Closed | ✅ Auto-populate questions when none provided (2026-07-28) |
| 26 | BR-01: isAnonymous change not locked on update | backend | Closed | ✅ update() rejects changing true→false (2026-07-28) |
| 27 | FR-05/BR-02: Min respondent threshold not enforced | backend | Closed | ✅ getResults() checks minThreshold (default 5) (2026-07-28) |
| 28 | FR-02: targetScope UI segmentasi tidak ada | frontend | Closed | ✅ Dept/grade multi-select in form (2026-07-28) |
| 29 | FR-03: Survey fill page + notification tidak ada | backend+frontend | Closed | ✅ /ess/surveys/[id] fill page + notification on publish (2026-07-28) |
| 30 | FR-02: Manpower approval not using WorkflowEngine | backend | Closed | ✅ Integrated with WorkflowEngineService (2026-07-28) |
| 31 | FR-06: No version tracking on manpower plan updates | backend | Closed | ✅ version auto-increment (2026-07-28) |
| 32 | FR-04: No auto-requisition on approval | backend | Closed | ✅ Auto-create job requisitions on final approval (2026-07-28) |
| 33 | FR-03: Cost estimate not using grade salary range | backend | Closed | ✅ Fallback to grade midpoint (2026-07-28) |

---

## 5. Testing Status

| Suite | Jumlah | Status |
|-------|--------|--------|
| Unit tests | 197 (30 suites — includes 16 employee-relations) | ✅ All passing |
| e2e tests | 81 (16 suites: health, auth, tenant-isolation, employee, employee-id, employee-relations, expense, medical, integrations, event-chain, attendance-*, leave-*, user-management) | ✅ All 81 passing (15 ER tests) |
| Frontend typecheck | `tsc --noEmit` | ✅ 0 errors |
| Frontend build | `npm run build` (Next.js) | ✅ (verified) |

---

## 6. Database — Model Inventory (97 models)

Tenant-scoped (all have `tenantId`):
Tenant, TenantEntity, User, UserRole, Role, RolePermission, Permission,
Employee, Employment, EmployeeContact, EmployeeDocument, EmployeeMedical,
Department, Position, Grade, Organization,
AttendanceRecord, AttendanceCorrection, Shift, Roster, RosterEntry, HolidayCalendar,
LeaveType, LeaveBalance, LeaveRequest, OvertimeRequest,
ExpenseClaim, ExpenseItem, Loan, LoanInstallment,
Asset, AssetAssignment,
PayrollRun, PayrollRunItem, PayrollRunItemComponent, PayrollPeriod,
PayrollComponent, SalaryComponent, Payslip, BankTransferBatch,
BpjsConfig, TaxConfig,
Benefit, BenefitEligibilityRule, EmployeeBenefit, EmployeeBenefitComponent,
ReviewCycle, PerformanceReview, Goal, CalibrationSession, FinalScore, Rating,
Candidate, JobPosting, JobRequisition, Application, Interview,
InterviewScorecard, Offer, OnboardingDocument,
ResignationRequest, ExitInterview, OffboardingTask,
Training, TrainingParticipant, Certification,
FeatureFlag, Integration, WorkflowDefinition, WorkflowInstance,
WorkflowStep, WorkflowApproval, AuditLog, JobQueue, EventOutbox, Notification,
EssPreference, EssNotification, EssOnboardingProgress, MovementRequest,
FinalSettlement,
ViolationCategory, DisciplinaryCase, IncidentReport, PpeAssignment,
TenantBranding, SystemHealthSnapshot, BackupRecord, MaintenanceWindow,
EngagementSurvey, SurveyQuestion, SurveyResponse, SurveyActionItem,
ManpowerPlan, ManpowerPlanItem

**Enums added:** SpLevel, DisciplinaryStatus, IncidentSeverity, IncidentCategory, PpeStatus, PpeCondition, BrandingSettingType, SurveyType, QuestionType, SurveyStatus, ActionStatus, ManpowerPlanStatus, ManpowerType

---

## 7. Revision History

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-07-13 | 1.0 | Initial TAD — master feature checklist & gap analysis |
| 2026-07-26 | 2.0 | Added §2.13 Employee Relations & Safety, §2.14 Branding, §2.15 Platform Operations. Renumbered ESS §2.13→§2.16, Analytics §2.14→§2.17. Updated model inventory 83→91, test count 181→197, added 7 enums. Added Known Gaps #13–#14 (docs). |
| 2026-07-26 | 2.1 | Added 12 e2e tests for Employee Relations. Fixed pre-existing e2e test failures (6 suites: attendance, user-management, leave, event-chain). Added cron job BR-05 auto-escalation. e2e test count 23→35. |
| 2026-07-26 | 2.2 | All 16 e2e suites passing (81 tests). Fixed root causes: tenant scoping (TenantEntity.id alignment), role-employee isSystem=true workaround, stale JobQueue cleanup. Added BR-05 cron job + e2e tests, FR-11 training compliance e2e tests. e2e test count 35→81. |
| 2026-07-26 | 2.3 | Fixed BrandingInjector localStorage key (flexy.auth.token → flexy.accessToken). Added TenantBranding seed data to seed.ts and seed-demo-nusantara.ts. Fixed role-employee.isSystem (true→false) in both seed files and DB manually. Added Zod branding schemas to admin.ts. |
| 2026-07-26 | 2.4 | Built User Management admin page (`app/(dashboard)/admin/users/page.tsx`) with CRUD, pagination, search, status filter, activate/deactivate/reset-password. Updated `fetchUsers` and `fetchAuditLogs` in `lib/api/admin.ts` to return paginated data. Added `useUsers`, `useUpdateUser`, `useDeactivateUser`, `useActivateUser`, `useResetUserPassword`, `useAuditLogs` hooks with params support. Added Zod `employeeId` and `roleIds` fields to `createUserSchema`. Updated admin landing page and sidebar with Users link.

| 2026-07-26 | 2.5 | Built Import CSV (FR-04): backend BulkImportController + BulkImportService (POST /admin/import/employees), frontend /admin/import page with upload, column mapping, preview, and bulk import results. Added useBulkImport hook. |
| 2026-07-26 | 2.6 | Enabled Workflow Designer step editing (FR-05): added useUpdateWorkflow hook, step add/edit/delete UI to existing workflow page, active Simpan Alur button now functional via PUT /admin/workflows/:id. |
| 2026-07-26 | 2.7 | Updated Known Gaps #20-#22: closed Import CSV (#20), closed Workflow Designer stepping (#21), added #22 AI Copilot as blocked pending mobile ESS ADR decision. |
| 2026-07-28 | 2.8 | Added §2.18 Engagement Survey, §2.19 Manpower Planning. Updated workflow defs 10→12 (overtime, manpower-plan). Added 6 models (EngagementSurvey, SurveyQuestion, SurveyResponse, SurveyActionItem, ManpowerPlan, ManpowerPlanItem). Added Known Gaps #23–#33 (all Closed). |
