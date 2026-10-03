-- Alumni Database
CREATE TABLE "Alumni" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "lastPosition" TEXT,
    "lastDepartment" TEXT,
    "lastGrade" TEXT,
    "resignationDate" TIMESTAMP(3) NOT NULL,
    "resignationType" TEXT NOT NULL,
    "personalEmail" TEXT,
    "personalPhone" TEXT,
    "linkedinUrl" TEXT,
    "currentCompany" TEXT,
    "currentPosition" TEXT,
    "isAvailableForRehire" BOOLEAN NOT NULL DEFAULT true,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Alumni_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Alumni_tenantId_employeeId_idx" ON "Alumni"("tenantId", "employeeId");
CREATE INDEX "Alumni_tenantId_isAvailableForRehire_idx" ON "Alumni"("tenantId", "isAvailableForRehire");

ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;