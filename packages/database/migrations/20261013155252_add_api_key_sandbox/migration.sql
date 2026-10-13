-- CreateEnum
CREATE TYPE "TaskDependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');

-- CreateEnum
CREATE TYPE "ForumThreadType" AS ENUM ('ANNOUNCEMENT', 'DISCUSSION', 'POLL', 'EVENT');

-- CreateEnum
CREATE TYPE "ForumVisibility" AS ENUM ('PUBLIC', 'DEPARTMENT', 'ROLE');

-- CreateEnum
CREATE TYPE "ForumTargetType" AS ENUM ('THREAD', 'COMMENT');

-- CreateEnum
CREATE TYPE "ForumReactionType" AS ENUM ('LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS');

-- CreateEnum
CREATE TYPE "ForumReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CompReviewCycleType" AS ENUM ('ANNUAL', 'MID_YEAR', 'PROMOTION', 'AD_HOC');

-- CreateEnum
CREATE TYPE "CompReviewStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_REVIEW', 'APPROVED', 'APPLIED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompAdjustmentType" AS ENUM ('MERIT', 'PROMOTION', 'MARKET_ADJUST', 'COLA');

-- CreateEnum
CREATE TYPE "CompAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "WebhookEndpoint" ALTER COLUMN "events" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "type" "TaskDependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "type" "ForumThreadType" NOT NULL DEFAULT 'DISCUSSION',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "visibility" "ForumVisibility" NOT NULL DEFAULT 'PUBLIC',
    "departmentId" TEXT,
    "pollOptions" JSONB,
    "eventDate" TIMESTAMP(3),
    "eventLocation" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" "ForumTargetType" NOT NULL,
    "threadId" TEXT,
    "commentId" TEXT,
    "userId" TEXT NOT NULL,
    "reactionType" "ForumReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumMention" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT,
    "commentId" TEXT,
    "mentionedUserId" TEXT,
    "mentionedEmployeeId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" "ForumTargetType" NOT NULL,
    "threadId" TEXT,
    "commentId" TEXT,
    "reportedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ForumReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompSalaryStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobFamily" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "minSalary" DECIMAL(18,2) NOT NULL,
    "midSalary" DECIMAL(18,2) NOT NULL,
    "maxSalary" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CompSalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompReviewCycle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompReviewCycleType" NOT NULL DEFAULT 'ANNUAL',
    "status" "CompReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" DATE NOT NULL,
    "totalBudget" DECIMAL(18,2),
    "allocatedBudget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CompReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewCycleId" TEXT,
    "employeeId" TEXT NOT NULL,
    "currentSalary" DECIMAL(18,2) NOT NULL,
    "proposedSalary" DECIMAL(18,2) NOT NULL,
    "adjustmentType" "CompAdjustmentType" NOT NULL DEFAULT 'MERIT',
    "adjustmentPercentage" DECIMAL(7,2),
    "reason" TEXT,
    "status" "CompAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "effectiveDate" DATE NOT NULL,
    "syncedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['*']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxEnvironment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sampleType" TEXT NOT NULL,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDependency_tenantId_taskId_idx" ON "TaskDependency"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_tenantId_taskId_dependsOnTaskId_key" ON "TaskDependency"("tenantId", "taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "ForumThread_tenantId_isPinned_createdAt_idx" ON "ForumThread"("tenantId", "isPinned" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ForumThread_tenantId_type_idx" ON "ForumThread"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ForumThread_tenantId_departmentId_idx" ON "ForumThread"("tenantId", "departmentId");

-- CreateIndex
CREATE INDEX "ForumThread_tenantId_authorUserId_idx" ON "ForumThread"("tenantId", "authorUserId");

-- CreateIndex
CREATE INDEX "ForumComment_threadId_createdAt_idx" ON "ForumComment"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumComment_tenantId_idx" ON "ForumComment"("tenantId");

-- CreateIndex
CREATE INDEX "ForumComment_parentCommentId_idx" ON "ForumComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "ForumReaction_tenantId_targetType_idx" ON "ForumReaction"("tenantId", "targetType");

-- CreateIndex
CREATE INDEX "ForumReaction_threadId_idx" ON "ForumReaction"("threadId");

-- CreateIndex
CREATE INDEX "ForumReaction_commentId_idx" ON "ForumReaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_targetType_threadId_commentId_userId_reaction_key" ON "ForumReaction"("targetType", "threadId", "commentId", "userId", "reactionType");

-- CreateIndex
CREATE INDEX "ForumMention_tenantId_mentionedEmployeeId_isRead_idx" ON "ForumMention"("tenantId", "mentionedEmployeeId", "isRead");

-- CreateIndex
CREATE INDEX "ForumMention_threadId_idx" ON "ForumMention"("threadId");

-- CreateIndex
CREATE INDEX "ForumMention_commentId_idx" ON "ForumMention"("commentId");

-- CreateIndex
CREATE INDEX "ForumReport_tenantId_status_createdAt_idx" ON "ForumReport"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ForumReport_threadId_idx" ON "ForumReport"("threadId");

-- CreateIndex
CREATE INDEX "ForumReport_commentId_idx" ON "ForumReport"("commentId");

-- CreateIndex
CREATE INDEX "CompSalaryStructure_tenantId_jobFamily_idx" ON "CompSalaryStructure"("tenantId", "jobFamily");

-- CreateIndex
CREATE INDEX "CompSalaryStructure_tenantId_effectiveDate_idx" ON "CompSalaryStructure"("tenantId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompSalaryStructure_tenantId_jobFamily_grade_effectiveDate_key" ON "CompSalaryStructure"("tenantId", "jobFamily", "grade", "effectiveDate");

-- CreateIndex
CREATE INDEX "CompReviewCycle_tenantId_status_idx" ON "CompReviewCycle"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CompReviewCycle_tenantId_effectiveDate_idx" ON "CompReviewCycle"("tenantId", "effectiveDate");

-- CreateIndex
CREATE INDEX "CompAdjustment_reviewCycleId_status_idx" ON "CompAdjustment"("reviewCycleId", "status");

-- CreateIndex
CREATE INDEX "CompAdjustment_tenantId_employeeId_idx" ON "CompAdjustment"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "CompAdjustment_tenantId_status_idx" ON "CompAdjustment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CompAdjustment_tenantId_effectiveDate_idx" ON "CompAdjustment"("tenantId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_isActive_idx" ON "ApiKey"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "SandboxEnvironment_tenantId_createdAt_idx" ON "SandboxEnvironment"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "ForumComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_mentionedEmployeeId_fkey" FOREIGN KEY ("mentionedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSalaryStructure" ADD CONSTRAINT "CompSalaryStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompReviewCycle" ADD CONSTRAINT "CompReviewCycle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompReviewCycle" ADD CONSTRAINT "CompReviewCycle_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompReviewCycle" ADD CONSTRAINT "CompReviewCycle_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAdjustment" ADD CONSTRAINT "CompAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAdjustment" ADD CONSTRAINT "CompAdjustment_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "CompReviewCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAdjustment" ADD CONSTRAINT "CompAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAdjustment" ADD CONSTRAINT "CompAdjustment_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
