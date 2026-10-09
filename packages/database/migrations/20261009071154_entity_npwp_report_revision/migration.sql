-- AlterTable
ALTER TABLE "GovernmentReport" ADD COLUMN     "revisionNo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisionOfId" TEXT;

-- AlterTable
ALTER TABLE "TenantEntity" ADD COLUMN     "kppCode" TEXT,
ADD COLUMN     "npwp" TEXT,
ADD COLUMN     "npwpName" TEXT;

-- AddForeignKey
ALTER TABLE "GovernmentReport" ADD CONSTRAINT "GovernmentReport_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "GovernmentReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
