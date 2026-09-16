-- THR Keagamaan (Permenaker 6/2016): run + per-employee records.
-- Verified applied on dev via db execute before marking applied.
CREATE TYPE "ThrRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

CREATE TABLE "ThrRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "holidayName" TEXT NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ThrRunStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ThrRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThrRun_tenantId_holidayDate_idx" ON "ThrRun"("tenantId", "holidayDate");

CREATE TABLE "ThrRecord" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "monthsWorked" INTEGER NOT NULL,
    "wageBase" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'calculated',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThrRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThrRecord_runId_employeeId_key" ON "ThrRecord"("runId", "employeeId");
CREATE INDEX "ThrRecord_employeeId_idx" ON "ThrRecord"("employeeId");
ALTER TABLE "ThrRecord" ADD CONSTRAINT "ThrRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ThrRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThrRecord" ADD CONSTRAINT "ThrRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
