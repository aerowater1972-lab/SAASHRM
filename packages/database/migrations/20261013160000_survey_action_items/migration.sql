-- QW-03 — Action Items pasca-survey (owner, deadline, status, progress)

-- AlterTable: tambah kolom progress/completion tracking + soft delete
ALTER TABLE "SurveyActionItem" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SurveyActionItem" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "SurveyActionItem" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "SurveyActionItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill: item yang sudah COMPLETED dianggap 100% selesai
UPDATE "SurveyActionItem" SET "progress" = 100, "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';

-- CreateIndex
CREATE INDEX "SurveyActionItem_assigneeId_status_idx" ON "SurveyActionItem"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "SurveyActionItem_dueDate_status_idx" ON "SurveyActionItem"("dueDate", "status");
