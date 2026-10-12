-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CostLogStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('EMPLOYMENT_CONTRACT', 'PAYROLL_PROCESSING', 'TAX_REPORTING', 'BPJS_REGISTRATION', 'HEALTH_INSURANCE', 'ATTENDANCE_TRACKING', 'PERFORMANCE_EVALUATION', 'TRAINING_DEVELOPMENT', 'BENEFITS_ADMINISTRATION', 'COMMUNICATION_MARKETING', 'THIRD_PARTY_SHARING', 'BIOMETRIC_PROCESSING', 'LOCATION_TRACKING', 'BACKGROUND_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GIVEN', 'WITHDRAWN', 'EXPIRED', 'REVOKED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION', 'WITHDRAW_CONSENT');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'UNDER_VERIFICATION', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DataSubjectType" AS ENUM ('EMPLOYEE', 'CANDIDATE', 'FORMER_EMPLOYEE', 'CONTRACTOR', 'VENDOR_CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "HelpdeskTicketCategory" AS ENUM ('PAYROLL', 'LEAVE', 'DOCUMENT', 'POLICY', 'BENEFIT', 'OTHER');

-- CreateEnum
CREATE TYPE "HelpdeskTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HelpdeskTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EbupotSubmissionStatus" AS ENUM ('PENDING', 'GENERATED', 'SUBMITTED', 'ACCEPTED', 'FAILED');

-- DropIndex
DROP INDEX "Tenant_parentTenantId_idx";

-- AlterTable
ALTER TABLE "SsoConnection" ALTER COLUMN "nameIdFormat" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OutsourcingVendor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "npwp" TEXT,
    "contactPerson" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutsourcingVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourcingContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractValue" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "description" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutsourcingContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourcedWorker" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "contractId" TEXT,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "hourlyRate" DECIMAL(18,2),
    "monthlyCost" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutsourcedWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourcedAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "hoursWorked" DECIMAL(5,2),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutsourcedAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourcedCostLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "hoursWorked" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "CostLogStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OutsourcedCostLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSubjectId" TEXT NOT NULL,
    "dataSubjectType" "DataSubjectType" NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "purposeDetail" TEXT,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GIVEN',
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "givenBy" TEXT,
    "givenMethod" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "expiresAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnBy" TEXT,
    "withdrawalReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revocationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestType" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "dataSubjectId" TEXT NOT NULL,
    "dataSubjectType" "DataSubjectType" NOT NULL,
    "dataSubjectEmail" TEXT NOT NULL,
    "dataSubjectName" TEXT NOT NULL,
    "requestDetails" TEXT NOT NULL,
    "legalBasis" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "rejectionReason" TEXT,
    "responseSummary" TEXT,
    "attachments" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequestActivity" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSubjectRequestActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "retentionPeriodDays" INTEGER NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "autoDelete" BOOLEAN NOT NULL DEFAULT false,
    "notifyBeforeDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProcessingLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSubjectId" TEXT NOT NULL,
    "dataSubjectType" "DataSubjectType" NOT NULL,
    "processingPurpose" "ConsentPurpose" NOT NULL,
    "dataCategories" TEXT[],
    "lawfulBasis" TEXT NOT NULL,
    "processorName" TEXT,
    "processorLocation" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "dpiaRequired" BOOLEAN NOT NULL DEFAULT false,
    "dpiaReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DataProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "category" "HelpdeskTicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "HelpdeskTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "HelpdeskTicketStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "firstResponseDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "satisfactionRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HelpdeskTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorEmployeeId" TEXT,
    "authorUserId" TEXT,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpdeskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskKbArticle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "HelpdeskTicketCategory" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HelpdeskKbArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbupotSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "taxMonth" INTEGER NOT NULL,
    "employeeName" TEXT,
    "npwp" TEXT,
    "receiptNumber" TEXT,
    "bruto" DECIMAL(18,2) NOT NULL,
    "pph21" DECIMAL(18,2) NOT NULL,
    "ptkp" DECIMAL(18,2) NOT NULL,
    "status" "EbupotSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "coretaxReference" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbupotSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutsourcingVendor_tenantId_idx" ON "OutsourcingVendor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OutsourcingVendor_tenantId_code_key" ON "OutsourcingVendor"("tenantId", "code");

-- CreateIndex
CREATE INDEX "OutsourcingContract_tenantId_vendorId_idx" ON "OutsourcingContract"("tenantId", "vendorId");

-- CreateIndex
CREATE INDEX "OutsourcingContract_tenantId_status_idx" ON "OutsourcingContract"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OutsourcingContract_tenantId_contractNumber_key" ON "OutsourcingContract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "OutsourcedWorker_tenantId_vendorId_idx" ON "OutsourcedWorker"("tenantId", "vendorId");

-- CreateIndex
CREATE INDEX "OutsourcedWorker_tenantId_status_idx" ON "OutsourcedWorker"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OutsourcedWorker_tenantId_vendorId_employeeId_key" ON "OutsourcedWorker"("tenantId", "vendorId", "employeeId");

-- CreateIndex
CREATE INDEX "OutsourcedAttendance_tenantId_date_idx" ON "OutsourcedAttendance"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OutsourcedAttendance_workerId_date_key" ON "OutsourcedAttendance"("workerId", "date");

-- CreateIndex
CREATE INDEX "OutsourcedCostLog_tenantId_periodStart_periodEnd_idx" ON "OutsourcedCostLog"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "OutsourcedCostLog_tenantId_status_idx" ON "OutsourcedCostLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_dataSubjectId_purpose_idx" ON "ConsentRecord"("tenantId", "dataSubjectId", "purpose");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_status_idx" ON "ConsentRecord"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_expiresAt_idx" ON "ConsentRecord"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_tenantId_status_idx" ON "DataSubjectRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_tenantId_dataSubjectId_idx" ON "DataSubjectRequest"("tenantId", "dataSubjectId");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_tenantId_dueDate_idx" ON "DataSubjectRequest"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "DataSubjectRequestActivity_requestId_createdAt_idx" ON "DataSubjectRequestActivity"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_tenantId_isActive_idx" ON "DataRetentionPolicy"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_tenantId_dataCategory_key" ON "DataRetentionPolicy"("tenantId", "dataCategory");

-- CreateIndex
CREATE INDEX "DataProcessingLog_tenantId_dataSubjectId_idx" ON "DataProcessingLog"("tenantId", "dataSubjectId");

-- CreateIndex
CREATE INDEX "DataProcessingLog_tenantId_processingPurpose_idx" ON "DataProcessingLog"("tenantId", "processingPurpose");

-- CreateIndex
CREATE INDEX "DataProcessingLog_tenantId_status_idx" ON "DataProcessingLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_tenantId_status_idx" ON "HelpdeskTicket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_tenantId_category_idx" ON "HelpdeskTicket"("tenantId", "category");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_tenantId_assigneeUserId_idx" ON "HelpdeskTicket"("tenantId", "assigneeUserId");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_tenantId_slaDueAt_idx" ON "HelpdeskTicket"("tenantId", "slaDueAt");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_employeeId_idx" ON "HelpdeskTicket"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "HelpdeskTicket_tenantId_ticketNumber_key" ON "HelpdeskTicket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "HelpdeskComment_ticketId_createdAt_idx" ON "HelpdeskComment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "HelpdeskComment_tenantId_idx" ON "HelpdeskComment"("tenantId");

-- CreateIndex
CREATE INDEX "HelpdeskKbArticle_tenantId_category_idx" ON "HelpdeskKbArticle"("tenantId", "category");

-- CreateIndex
CREATE INDEX "HelpdeskKbArticle_tenantId_createdByUserId_idx" ON "HelpdeskKbArticle"("tenantId", "createdByUserId");

-- CreateIndex
CREATE INDEX "EbupotSubmission_tenantId_status_idx" ON "EbupotSubmission"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EbupotSubmission_tenantId_taxYear_taxMonth_idx" ON "EbupotSubmission"("tenantId", "taxYear", "taxMonth");

-- CreateIndex
CREATE INDEX "EbupotSubmission_employeeId_idx" ON "EbupotSubmission"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EbupotSubmission_tenantId_employeeId_taxYear_taxMonth_key" ON "EbupotSubmission"("tenantId", "employeeId", "taxYear", "taxMonth");

-- AddForeignKey
ALTER TABLE "OutsourcingVendor" ADD CONSTRAINT "OutsourcingVendor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcingContract" ADD CONSTRAINT "OutsourcingContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcingContract" ADD CONSTRAINT "OutsourcingContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "OutsourcingVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedWorker" ADD CONSTRAINT "OutsourcedWorker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedWorker" ADD CONSTRAINT "OutsourcedWorker_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "OutsourcingVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedWorker" ADD CONSTRAINT "OutsourcedWorker_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "OutsourcingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedAttendance" ADD CONSTRAINT "OutsourcedAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedAttendance" ADD CONSTRAINT "OutsourcedAttendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "OutsourcedWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedCostLog" ADD CONSTRAINT "OutsourcedCostLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedCostLog" ADD CONSTRAINT "OutsourcedCostLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "OutsourcedWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequestActivity" ADD CONSTRAINT "DataSubjectRequestActivity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataSubjectRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProcessingLog" ADD CONSTRAINT "DataProcessingLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskComment" ADD CONSTRAINT "HelpdeskComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpdeskTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskComment" ADD CONSTRAINT "HelpdeskComment_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskComment" ADD CONSTRAINT "HelpdeskComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskKbArticle" ADD CONSTRAINT "HelpdeskKbArticle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskKbArticle" ADD CONSTRAINT "HelpdeskKbArticle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbupotSubmission" ADD CONSTRAINT "EbupotSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbupotSubmission" ADD CONSTRAINT "EbupotSubmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbupotSubmission" ADD CONSTRAINT "EbupotSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
