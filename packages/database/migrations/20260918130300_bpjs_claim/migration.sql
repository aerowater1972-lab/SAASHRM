-- BPJS Kesehatan Claim model (rawat inap/paru) + enums
CREATE TYPE "BpjsClaimType" AS ENUM ('RAWAT_INAP', 'RAWAT_JALAN', 'KUNING', 'MERAH', 'KELAHIRAN', 'LAINNYA');
CREATE TYPE "BpjsClaimStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID');

CREATE TABLE "BpjsClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "claimType" "BpjsClaimType" NOT NULL,
    "diagnosisCode" TEXT,
    "diagnosisName" TEXT,
    "admissionDate" TIMESTAMP(3),
    "dischargeDate" TIMESTAMP(3),
    "daysOfCare" INTEGER,
    "hospitalCode" TEXT,
    "hospitalName" TEXT,
    "claimAmount" DECIMAL(18, 2) NOT NULL,
    "approvedAmount" DECIMAL(18, 2),
    "patientShare" DECIMAL(18, 2),
    "status" "BpjsClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BpjsClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BpjsClaim_tenantId_employeeId_idx" ON "BpjsClaim"("tenantId", "employeeId");
CREATE INDEX "BpjsClaim_tenantId_status_idx" ON "BpjsClaim"("tenantId", "status");
CREATE INDEX "BpjsClaim_tenantId_claimNumber_idx" ON "BpjsClaim"("tenantId", "claimNumber");

ALTER TABLE "BpjsClaim" ADD CONSTRAINT "BpjsClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BpjsClaim" ADD CONSTRAINT "BpjsClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;