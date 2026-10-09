-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "depreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
ADD COLUMN     "depreciationStartDate" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT,
ADD COLUMN     "residualValue" DECIMAL(18,2),
ADD COLUMN     "usefulLifeMonths" INTEGER;

-- CreateTable
CREATE TABLE "AssetDepreciation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "bookValueAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDepreciation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetDepreciation_year_month_idx" ON "AssetDepreciation"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciation_assetId_year_month_key" ON "AssetDepreciation"("assetId", "year", "month");

-- CreateIndex
CREATE INDEX "Asset_qrToken_idx" ON "Asset"("qrToken");

-- AddForeignKey
ALTER TABLE "AssetDepreciation" ADD CONSTRAINT "AssetDepreciation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
