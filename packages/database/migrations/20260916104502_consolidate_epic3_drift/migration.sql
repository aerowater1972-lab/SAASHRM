-- Consolidate drift (part 2/2). Applies after the enums migration.
-- REVIEWED line-by-line; marked applied via migrate resolve (not executed on dev).
-- Contents: out-of-band tables/indexes/FKs (talent, succession, documents,
-- announcements), AuditLog FK recreated ON DELETE SET NULL, Employee.ptkp_category,
-- 5 PayrollComponent calculation columns, plus the ptkp backfill data fix.

-- CreateEnum
CREATE TYPE "TalentPoolStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TalentReadiness" AS ENUM ('NOT_READY', 'DEVELOPING', 'READY_IN_1_2_YEARS', 'READY_NOW');

-- CreateEnum
CREATE TYPE "SuccessionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentPermissionLevel" AS ENUM ('VIEW', 'EDIT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentAccessLevel" AS ENUM ('PRIVATE', 'DEPARTMENT', 'TENANT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "DocumentPermissionType" AS ENUM ('ROLE', 'USER', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'ARCHIVED', 'SIGNED', 'SHARED', 'COMMENTED', 'VERSION_CREATED');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'URGENT', 'EVENT', 'POLICY', 'MAINTENANCE', 'CELEBRATION');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'DEPARTMENT', 'ROLE', 'USER', 'LOCATION');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');



-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_changedBy_fkey";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "ptkp_category" TEXT NOT NULL DEFAULT 'TK/0';

-- AlterTable
ALTER TABLE "PayrollComponent" ADD COLUMN     "calculation_method" TEXT,
ADD COLUMN     "default_value" DECIMAL(18,2),
ADD COLUMN     "max_cap" DECIMAL(18,2),
ADD COLUMN     "percentage" DECIMAL(5,2),
ADD COLUMN     "sort_order" INTEGER;

-- CreateTable
CREATE TABLE "TalentPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" TEXT,
    "status" "TalentPoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TalentPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentPoolMember" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "performanceBand" TEXT,
    "potentialBand" TEXT,
    "readiness" "TalentReadiness" NOT NULL DEFAULT 'NOT_READY',
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentPoolMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessionPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "currentEmployeeId" TEXT,
    "status" "SuccessionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "riskCode" TEXT,
    "targetReadyDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SuccessionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessionCandidate" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "readiness" "TalentReadiness" NOT NULL DEFAULT 'NOT_READY',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "assessmentNotes" TEXT,
    "decision" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT '#6366F1',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "accessLevel" "DocumentAccessLevel" NOT NULL DEFAULT 'TENANT',
    "departmentId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "changeLog" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPermission" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "permissionType" "DocumentPermissionType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "permission" "DocumentPermissionLevel" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER,
    "userId" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentActivity" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "DocumentAction" NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "targetAudience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readReceiptRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalentPool_tenantId_status_idx" ON "TalentPool"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TalentPool_tenantId_name_key" ON "TalentPool"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TalentPoolMember_poolId_idx" ON "TalentPoolMember"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentPoolMember_poolId_employeeId_key" ON "TalentPoolMember"("poolId", "employeeId");

-- CreateIndex
CREATE INDEX "SuccessionPlan_tenantId_status_idx" ON "SuccessionPlan"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessionPlan_tenantId_positionId_key" ON "SuccessionPlan"("tenantId", "positionId");

-- CreateIndex
CREATE INDEX "SuccessionCandidate_planId_idx" ON "SuccessionCandidate"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessionCandidate_planId_employeeId_key" ON "SuccessionCandidate"("planId", "employeeId");

-- CreateIndex
CREATE INDEX "DocumentCategory_tenantId_isActive_idx" ON "DocumentCategory"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_tenantId_name_key" ON "DocumentCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Document_tenantId_categoryId_idx" ON "Document"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Document_tenantId_createdById_idx" ON "Document"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "Document_tenantId_isTemplate_idx" ON "Document"("tenantId", "isTemplate");

-- CreateIndex
CREATE INDEX "Document_tenantId_departmentId_idx" ON "Document"("tenantId", "departmentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentPermission_documentId_idx" ON "DocumentPermission"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPermission_documentId_permissionType_targetId_key" ON "DocumentPermission"("documentId", "permissionType", "targetId");

-- CreateIndex
CREATE INDEX "DocumentSignature_documentId_userId_idx" ON "DocumentSignature"("documentId", "userId");

-- CreateIndex
CREATE INDEX "DocumentSignature_documentId_status_idx" ON "DocumentSignature"("documentId", "status");

-- CreateIndex
CREATE INDEX "DocumentActivity_documentId_createdAt_idx" ON "DocumentActivity"("documentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DocumentActivity_userId_createdAt_idx" ON "DocumentActivity"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Announcement_tenantId_status_publishAt_idx" ON "Announcement"("tenantId", "status", "publishAt" DESC);

-- CreateIndex
CREATE INDEX "Announcement_tenantId_type_idx" ON "Announcement"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_createdById_idx" ON "Announcement"("tenantId", "createdById");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPool" ADD CONSTRAINT "TalentPool_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "TalentPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_currentEmployeeId_fkey" FOREIGN KEY ("currentEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SuccessionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCategory" ADD CONSTRAINT "DocumentCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data backfill (GapFix Epic 3 v1.3): preserve pre-column behavior
-- (MARRIED behaved as K/0 for TER/PTKP). Employees WITH dependents still
-- need manual HR review - the system cannot infer dependent counts.
UPDATE "Employee" SET "ptkp_category" = CASE WHEN "maritalStatus" = 'MARRIED' THEN 'K/0' ELSE 'TK/0' END;
