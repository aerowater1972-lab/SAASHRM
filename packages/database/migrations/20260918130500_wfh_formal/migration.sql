-- WFH Formal: WFH Request + Policy
CREATE TYPE "WfhRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "WfhRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "WfhRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WfhRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WfhPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxDaysPerWeek" INTEGER NOT NULL DEFAULT 2,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "eligibleGrades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WfhPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WfhRequest_tenantId_employeeId_idx" ON "WfhRequest"("tenantId", "employeeId");
CREATE INDEX "WfhRequest_tenantId_status_idx" ON "WfhRequest"("tenantId", "status");
CREATE INDEX "WfhRequest_tenantId_startDate_idx" ON "WfhRequest"("tenantId", "startDate");
CREATE INDEX "WfhPolicy_tenantId_isActive_idx" ON "WfhPolicy"("tenantId", "isActive");

ALTER TABLE "WfhRequest" ADD CONSTRAINT "WfhRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WfhRequest" ADD CONSTRAINT "WfhRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WfhPolicy" ADD CONSTRAINT "WfhPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;