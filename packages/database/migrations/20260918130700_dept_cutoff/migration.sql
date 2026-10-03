-- Department cut-off time for clock-in
ALTER TABLE "Department" 
ADD COLUMN "cutOffTime" TEXT,
ADD COLUMN "cutOffGraceMinutes" INTEGER NOT NULL DEFAULT 15;

-- Optional: Add comment
COMMENT ON COLUMN "Department"."cutOffTime" IS 'Department-level clock-in cut-off time (HH:mm format)';
COMMENT ON COLUMN "Department"."cutOffGraceMinutes" IS 'Grace minutes for late clock-in at department level';