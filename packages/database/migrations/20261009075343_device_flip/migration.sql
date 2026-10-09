-- CreateEnum
CREATE TYPE "FlipDisbursementStatus" AS ENUM ('DRAFT', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlipDisbursement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT,
    "flipId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "remark" TEXT,
    "status" "FlipDisbursementStatus" NOT NULL DEFAULT 'DRAFT',
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlipDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricDevice_tenantId_idx" ON "BiometricDevice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_tenantId_deviceId_key" ON "BiometricDevice"("tenantId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "FlipDisbursement_idempotencyKey_key" ON "FlipDisbursement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FlipDisbursement_tenantId_payrollRunId_idx" ON "FlipDisbursement"("tenantId", "payrollRunId");

-- CreateIndex
CREATE INDEX "FlipDisbursement_status_idx" ON "FlipDisbursement"("status");
