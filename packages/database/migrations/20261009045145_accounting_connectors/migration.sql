-- CreateEnum
CREATE TYPE "AccountingConnectorType" AS ENUM ('JURNAL', 'XERO', 'ACCURATE', 'QUICKBOOKS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "AccountingConnector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountingConnectorType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "credentials" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "syncPayroll" BOOLEAN NOT NULL DEFAULT true,
    "syncExpense" BOOLEAN NOT NULL DEFAULT false,
    "syncAsset" BOOLEAN NOT NULL DEFAULT false,
    "chartOfAccounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingSyncLog" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsSuccess" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "payload" JSONB,
    "response" JSONB,

    CONSTRAINT "AccountingSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingConnector_tenantId_name_key" ON "AccountingConnector"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AccountingSyncLog_connectorId_startedAt_idx" ON "AccountingSyncLog"("connectorId", "startedAt");

-- AddForeignKey
ALTER TABLE "AccountingConnector" ADD CONSTRAINT "AccountingConnector_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingSyncLog" ADD CONSTRAINT "AccountingSyncLog_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "AccountingConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
