-- Clearance Certificate (Paklaring) for employee offboarding
-- Related to ResignationRequest, issued when offboarding is complete

CREATE TABLE "ClearanceCertificate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resignationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClearanceCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClearanceCertificate_resignationId_key" ON "ClearanceCertificate"("resignationId");
CREATE INDEX "ClearanceCertificate_tenantId_employeeId_idx" ON "ClearanceCertificate"("tenantId", "employeeId");
CREATE INDEX "ClearanceCertificate_tenantId_status_idx" ON "ClearanceCertificate"("tenantId", "status");

ALTER TABLE "ClearanceCertificate" ADD CONSTRAINT "ClearanceCertificate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClearanceCertificate" ADD CONSTRAINT "ClearanceCertificate_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "ResignationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClearanceCertificate" ADD CONSTRAINT "ClearanceCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;