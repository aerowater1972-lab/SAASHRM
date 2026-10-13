-- QW-01 — Scheduled Report (auto-email laporan terjadwal)

-- CreateEnum
CREATE TYPE "ScheduledReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduledReportStatus" AS ENUM ('IDLE', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "frequency" "ScheduledReportFrequency" NOT NULL DEFAULT 'DAILY',
    "hour" INTEGER NOT NULL DEFAULT 7,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "recipients" TEXT[],
    "filters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" "ScheduledReportStatus" NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledReport_tenantId_isActive_idx" ON "ScheduledReport"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ScheduledReport_isActive_nextRunAt_idx" ON "ScheduledReport"("isActive", "nextRunAt");
