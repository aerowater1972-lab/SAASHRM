-- PD-04: retry / partial-failure tracking untuk Flip disbursement
ALTER TABLE "FlipDisbursement" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
