-- Make changedBy nullable so audit events whose actor user was already
-- deleted do not violate the AuditLog_changedBy_fkey foreign key.
-- The FK constraint still enforces valid values when changedBy is present.
ALTER TABLE "AuditLog" ALTER COLUMN "changedBy" DROP NOT NULL;