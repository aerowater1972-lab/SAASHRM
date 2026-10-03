-- Hubungan industrial kolektif: pengaduan pekerja (grievance) & notulen LKS Bipartit
CREATE TABLE "GrievanceCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "handlerId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GrievanceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BipartiteSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "managementAttendees" TEXT NOT NULL,
    "workerAttendees" TEXT NOT NULL,
    "minutes" TEXT,
    "followUps" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BipartiteSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrievanceCase_tenantId_status_idx" ON "GrievanceCase"("tenantId", "status");
CREATE INDEX "GrievanceCase_reporterId_idx" ON "GrievanceCase"("reporterId");
CREATE INDEX "BipartiteSession_tenantId_sessionDate_idx" ON "BipartiteSession"("tenantId", "sessionDate");

ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BipartiteSession" ADD CONSTRAINT "BipartiteSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
