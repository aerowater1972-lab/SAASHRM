-- Pesangon & kompensasi akhir hubungan kerja (PP 35/2021).
-- Verified applied on dev via db execute before marking applied.
CREATE TABLE "SeveranceCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "termination_date" DATE NOT NULL,
    "tenure_months" INTEGER NOT NULL,
    "wageBase" DECIMAL(18,2) NOT NULL,
    "up_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "upmk_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "uph_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pisah_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeveranceCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeveranceCase_tenantId_status_idx" ON "SeveranceCase"("tenantId", "status");
CREATE INDEX "SeveranceCase_employeeId_idx" ON "SeveranceCase"("employeeId");
ALTER TABLE "SeveranceCase" ADD CONSTRAINT "SeveranceCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
