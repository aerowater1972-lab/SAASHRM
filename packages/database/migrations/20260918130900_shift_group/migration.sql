-- Shift Group for rotation management (1/2/3 shifts)
-- NOTE (drift fix 2026-10-03): WfhPolicy/WfhRequest/WfhRequestStatus are
-- already provided by 20260918130500_wfh_formal (applied). This migration
-- now contains ONLY the ShiftGroup portion to avoid
-- "relation WfhPolicy already exists" (P3018/42P07) on replay.
CREATE TABLE "ShiftGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShiftGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShiftGroup" ADD CONSTRAINT "ShiftGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add shiftGroupId to Shift
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "shiftGroupId" TEXT;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Shift_tenantId_shiftGroupId_idx" ON "Shift"("tenantId", "shiftGroupId");

-- Add shiftGroupId to Employment
ALTER TABLE "Employment" ADD COLUMN IF NOT EXISTS "shiftGroupId" TEXT;
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add shiftGroup relation to Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftGroupId" TEXT;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Employee_shiftGroupId_idx" ON "Employee"("tenantId", "shiftGroupId");