-- Backfill batas lembur bulanan per grade (kebijakan perusahaan, bukan statutori).
-- Hanya mengisi yang masih NULL agar kustomisasi tenant tidak tertimpa.
-- Pemetaan: level 1-2 -> 20 jam, level 3 -> 16 jam, level 4-5 -> 12 jam, lainnya -> 8 jam.
-- NOTE (drift fix 2026-10-03): kolom ini dibuat out-of-band via db execute di
-- dev tanpa migration DDL, sehingga replay dari nol (shadow/staging) gagal
-- dengan "column does not exist". ADD COLUMN IF NOT EXISTS membuat file ini
-- self-contained: no-op di dev (kolom sudah ada), wajib ada di DB baru.
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "maxOvertimeHoursPerMonth" INTEGER;
UPDATE "Grade"
SET "maxOvertimeHoursPerMonth" = CASE
  WHEN "level" <= 2 THEN 20
  WHEN "level" = 3 THEN 16
  WHEN "level" <= 5 THEN 12
  ELSE 8
END
WHERE "maxOvertimeHoursPerMonth" IS NULL;
