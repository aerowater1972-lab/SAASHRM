-- Allow API/DTO component type EARNING (used by web UI + CreateComponentDto).
-- Additive only: existing values (ALLOWANCE, ...) untouched. Verified applied
-- on dev via db execute before marking applied with migrate resolve.
ALTER TYPE "PayrollComponentType" ADD VALUE 'EARNING';
