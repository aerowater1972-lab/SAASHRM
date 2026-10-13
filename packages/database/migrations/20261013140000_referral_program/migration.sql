-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REVIEWING', 'HIRED', 'REJECTED');

-- CreateTable
CREATE TABLE "EmployeeReferral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerEmployeeId" TEXT NOT NULL,
    "referredCandidateId" TEXT,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "candidatePhone" TEXT,
    "resumeUrl" TEXT,
    "positionApplied" TEXT,
    "notes" TEXT,
    "bonusAmount" DECIMAL(18,2),
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "bonusPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeReferral_tenantId_status_idx" ON "EmployeeReferral"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EmployeeReferral_tenantId_referrerEmployeeId_idx" ON "EmployeeReferral"("tenantId", "referrerEmployeeId");

-- CreateIndex
CREATE INDEX "EmployeeReferral_tenantId_candidateEmail_idx" ON "EmployeeReferral"("tenantId", "candidateEmail");

-- AddForeignKey
ALTER TABLE "EmployeeReferral" ADD CONSTRAINT "EmployeeReferral_referredCandidateId_fkey" FOREIGN KEY ("referredCandidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
