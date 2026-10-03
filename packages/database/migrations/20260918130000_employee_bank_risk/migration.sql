-- Master rekening gaji karyawan + tingkat risiko JKK per jabatan/grade (PP 44/2015)
ALTER TABLE "Employee" ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountName" TEXT;

ALTER TABLE "Position" ADD COLUMN "riskLevel" TEXT;

ALTER TABLE "Grade" ADD COLUMN "riskLevel" TEXT;
