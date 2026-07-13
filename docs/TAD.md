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

### 2.13 ESS (`modules/ess/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Employee profile | `profile.controller.ts` | `profile.service.ts` | ✅ |
| Attendance (ESS view) | `attendance-ess.controller.ts` | — | ✅ |
| Leave (ESS view + apply) | `leave-ess.controller.ts` | — | ✅ |
| Payslip (ESS view) | `payslip-ess.controller.ts` | — | ✅ |
| Dashboard | `dashboard.controller.ts` | `dashboard.service.ts` | ✅ |
| Preferences | `preference-ess.controller.ts` | — | ✅ |
| Notifications | `notification-ess.controller.ts` | — | ✅ |

### 2.14 Analytics (`modules/analytics/`)
| Fitur | Controller | Service | Status |
|-------|-----------|---------|--------|
| Dashboard aggregations | `analytics.controller.ts` | `analytics.service.ts` | ✅ |
| Filter by period/entity | — | — | ✅ |

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
- 10 registered definitions: `expense`, `loan`, `resignation`, `leave`, `benefit-enrollment`, `performance-review`, `performance-goal`, `payroll-run`, `training`, `onboarding`
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
| 2 | DI fix: WorkflowEngineService missing in benefit/training test mocks (2026-07-13) | benefit, learning | Closed | ✅ 181/181 unit tests passing |
| 3 | No RLS — multi-tenancy at app-layer only | cross-cutting | Low | Acceptable until external tenants onboarded |
| 4 | Rate limiting on login endpoint | admin | Closed | ✅ `@Throttle({ default: { limit: 10, ttl: 60000 } })` added (2026-07-13) |
| 5 | No background job for payroll run (sync processing) | payroll | Medium | Payroll run is synchronous; async via JobQueue is future work |
| 6 | No SMS/WhatsApp notification channel | shared/notifications | Low | Email-only (Nodemailer) |
| 7 | No API versioning beyond `/api/v1/` | cross-cutting | Low | Single version sufficient for now |
| 8 | No OpenAPI/Swagger `@ApiResponse` on most endpoints | all | Low | Only basic Swagger decorators exist |
| 9 | ESS list endpoints (leave, attendance, payslip, notifications) tidak pakai server-side pagination | ess | Low | Personal views — pagination less critical, data terbatas per user |
| 10 | Backup/restore script in repo | devops | Closed | ✅ `scripts/backup.sh` + `scripts/restore.sh` created (2026-07-13) |
| 11 | No monitoring/alerting config | devops | Low | Future work |
| 12 | Certification pagination — `CertificationFilterDto` tidak extend `PaginationQueryDto` | learning | Closed | ✅ Fixed (2026-07-13) — kini extend + `paginate()` di service |

---

## 5. Testing Status

| Suite | Jumlah | Status |
|-------|--------|--------|
| Unit tests | 181 (29 suites) | ✅ All passing |
| e2e tests | 23 (5 suites: health, auth, tenant-isolation, employee, expense) | ✅ All passing |
| Frontend build | `npm run build` (Next.js) | ✅ (verified) |

---

## 6. Database — Model Inventory (83 models)

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
FinalSettlement, Certification

---

## 7. Revision History

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-07-13 | 1.0 | Initial TAD — master feature checklist & gap analysis |
