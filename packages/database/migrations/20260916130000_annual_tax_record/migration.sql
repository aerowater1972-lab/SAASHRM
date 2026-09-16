-- Rekonsiliasi PPh21 tahunan + bukti potong 1721-A1.
-- Verified applied on dev via db execute before marking applied.
CREATE TABLE "AnnualTaxRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grossAnnual" DECIMAL(18,2) NOT NULL,
    "biayaJabatan" DECIMAL(18,2) NOT NULL,
    "bpjsAnnual" DECIMAL(18,2) NOT NULL,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAnnual" DECIMAL(18,2) NOT NULL,
    "ptkpCategory" TEXT NOT NULL,
    "ptkp" DECIMAL(18,2) NOT NULL,
    "pkp" DECIMAL(18,2) NOT NULL,
    "annualTax" DECIMAL(18,2) NOT NULL,
    "totalWithheld" DECIMAL(18,2) NOT NULL,
    "adjustment" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "monthly" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnnualTaxRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnualTaxRecord_tenantId_employeeId_year_key" ON "AnnualTaxRecord"("tenantId", "employeeId", "year");
CREATE INDEX "AnnualTaxRecord_tenantId_year_idx" ON "AnnualTaxRecord"("tenantId", "year");
ALTER TABLE "AnnualTaxRecord" ADD CONSTRAINT "AnnualTaxRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
