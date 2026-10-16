-- FieldTerritory: dukung level department/branch (bukan hanya per karyawan)
-- employeeId jadi nullable, tambah departmentId, hapus unique constraint employeeId

ALTER TABLE "FieldTerritory" ALTER COLUMN "employeeId" DROP NOT NULL;

-- Drop unique constraint on employeeId (Prisma-named)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FieldTerritory_employeeId_key'
      AND conrelid = 'FieldTerritory'::regclass
  ) THEN
    ALTER TABLE "FieldTerritory" DROP CONSTRAINT "FieldTerritory_employeeId_key";
  END IF;
END $$;

-- Add departmentId column
ALTER TABLE "FieldTerritory" ADD COLUMN "departmentId" TEXT;

-- Foreign key to Department
ALTER TABLE "FieldTerritory"
  ADD CONSTRAINT "FieldTerritory_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "FieldTerritory_tenantId_departmentId_idx" ON "FieldTerritory"("tenantId", "departmentId");
CREATE INDEX IF NOT EXISTS "FieldTerritory_tenantId_employeeId_idx" ON "FieldTerritory"("tenantId", "employeeId");