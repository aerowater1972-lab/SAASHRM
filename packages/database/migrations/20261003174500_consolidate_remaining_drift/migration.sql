-- Consolidate remaining drift (2026-10-03). Generated via
-- `prisma migrate diff --from-migrations --to-schema-datamodel --script`
-- against shadow DB, REVIEWED line-by-line. Safe: no DROP TABLE/COLUMN,
-- only FK rule alignment (RESTRICT -> CASCADE per schema), index alignment,
-- WfhPolicy default alignment, plus CREATE BpjsKetenagakerjaanClaim (model in
-- schema, table never created by any migration) and missing ShiftGroup indexes.

-- CreateEnum
CREATE TYPE "BpjsKetenagakerjaanClaimType" AS ENUM ('JKK', 'JKM', 'JHT', 'JP');

-- CreateEnum
CREATE TYPE "BpjsKetenagakerjaanClaimStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID');

-- DropForeignKey
ALTER TABLE "Alumni" DROP CONSTRAINT "Alumni_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ClearanceCertificate" DROP CONSTRAINT "ClearanceCertificate_resignationId_fkey";

-- DropForeignKey
ALTER TABLE "ClearanceCertificate" DROP CONSTRAINT "ClearanceCertificate_tenantId_fkey";

-- DropIndex
DROP INDEX "Employee_shiftGroupId_idx";

-- AlterTable
ALTER TABLE "WfhPolicy" ALTER COLUMN "eligibleGrades" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BpjsKetenagakerjaanClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "claimType" "BpjsKetenagakerjaanClaimType" NOT NULL,
    "diagnosisCode" TEXT,
    "diagnosisName" TEXT,
    "admissionDate" TIMESTAMP(3),
    "dischargeDate" TIMESTAMP(3),
    "daysOfCare" INTEGER,
    "hospitalCode" TEXT,
    "hospitalName" TEXT,
    "claimAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2),
    "patientShare" DECIMAL(18,2),
    "status" "BpjsKetenagakerjaanClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BpjsKetenagakerjaanClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BpjsKetenagakerjaanClaim_tenantId_employeeId_idx" ON "BpjsKetenagakerjaanClaim"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "BpjsKetenagakerjaanClaim_tenantId_status_idx" ON "BpjsKetenagakerjaanClaim"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BpjsKetenagakerjaanClaim_tenantId_claimNumber_idx" ON "BpjsKetenagakerjaanClaim"("tenantId", "claimNumber");

-- CreateIndex
CREATE INDEX "ShiftGroup_tenantId_isActive_idx" ON "ShiftGroup"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftGroup_tenantId_code_key" ON "ShiftGroup"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "BpjsKetenagakerjaanClaim" ADD CONSTRAINT "BpjsKetenagakerjaanClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpjsKetenagakerjaanClaim" ADD CONSTRAINT "BpjsKetenagakerjaanClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceCertificate" ADD CONSTRAINT "ClearanceCertificate_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "ResignationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
