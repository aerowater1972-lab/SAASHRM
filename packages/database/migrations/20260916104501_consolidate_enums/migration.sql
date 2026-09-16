-- Consolidate drift enums (part 1/2). MUST apply in its own transaction:
-- new enum values cannot be referenced before commit (PostgreSQL restriction).
-- All values below were verified present on dev before marking applied.
-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'DRAFT';
ALTER TYPE "DocumentStatus" ADD VALUE 'REVIEW';
ALTER TYPE "DocumentStatus" ADD VALUE 'PUBLISHED';
ALTER TYPE "PayrollRunStatus" ADD VALUE 'LOCKED';
