-- CreateEnum
CREATE TYPE "GovernmentReportType" AS ENUM ('DJP_SPT_1721_A1', 'DJP_SPT_1721_A2', 'DJP_EBUPOT_UNIFIKASI', 'DJP_SPT_MASA_PPH21', 'DJP_SPT_MASA_PPH23', 'DJP_SPT_MASA_PPH26', 'BPJS_KESEHATAN_IURAN', 'BPJS_KETENAGAKERJAAN_IURAN', 'BPJS_KETENAGAKERJAAN_JHT', 'BPJS_KETENAGAKERJAAN_JP', 'BPJS_KETENAGAKERJAAN_KP', 'SIPP_LAPORAN_TENAGA_KERJA', 'SIPP_LAPORAN_UPAH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GovernmentReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR');

-- CreateTable
CREATE TABLE "GovernmentReportConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" "GovernmentReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "credentials" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "schedule" JSONB,
    "lastGeneratedAt" TIMESTAMP(3),
    "lastSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentReportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentReport" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "GovernmentReportStatus" NOT NULL DEFAULT 'DRAFT',
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "validationErrors" JSONB,
    "submissionToken" TEXT,
    "submissionRef" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentReportConfig_tenantId_reportType_name_key" ON "GovernmentReportConfig"("tenantId", "reportType", "name");

-- CreateIndex
CREATE INDEX "GovernmentReport_configId_periodStart_periodEnd_idx" ON "GovernmentReport"("configId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "GovernmentReport_status_createdAt_idx" ON "GovernmentReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "GovernmentReportConfig" ADD CONSTRAINT "GovernmentReportConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentReport" ADD CONSTRAINT "GovernmentReport_configId_fkey" FOREIGN KEY ("configId") REFERENCES "GovernmentReportConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
