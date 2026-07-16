-- F-05: add encrypted salary column for Employment (at-rest encryption).
-- Apply AFTER the schema change that introduces `salary_enc`.
-- Once applied, enable SALARY_ENCRYPTION_ENABLED=true so the Prisma middleware
-- (apps/api/src/common/prisma/prisma.service.ts) encrypts on write and decrypts
-- on read. Until then, Employment.salary remains plaintext and behavior is unchanged.

ALTER TABLE "Employment" ADD COLUMN IF NOT EXISTS "salary_enc" text;
