-- Dedicated BPJS Kesehatan rate columns (previously health contributions
-- wrongly read the JHT columns: 3.7%/2% instead of 4%/1%).
-- Verified applied on dev via db execute before marking applied.
ALTER TABLE "BpjsConfig" ADD COLUMN "kes_employer_rate" DECIMAL(5,4);
ALTER TABLE "BpjsConfig" ADD COLUMN "kes_employee_rate" DECIMAL(5,4);

-- Backfill lawful defaults (UU BPJS Kesehatan) for existing KES rows.
UPDATE "BpjsConfig" SET "kes_employer_rate" = 0.04, "kes_employee_rate" = 0.01 WHERE "type" = 'KES' AND "kes_employer_rate" IS NULL;
