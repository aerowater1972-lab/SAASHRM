-- Multi-tenant RLS setup for Flexy HRMS
-- This script runs on first database initialization

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Seed default tenant
INSERT INTO "Tenant" (id, name, domain, package, status, settings)
VALUES (
  'default',
  'Default Tenant',
  'default.flexy-hrms.com',
  'STANDARD',
  'ACTIVE',
  '{"timezone": "Asia/Jakarta", "currency": "IDR", "dateFormat": "DD/MM/YYYY", "language": "id"}'
) ON CONFLICT (id) DO NOTHING;

-- Seed default roles
INSERT INTO "Role" (id, "tenantId", name, description, "isSystem")
VALUES 
  ('admin-role', 'default', 'System Admin', 'Full system access', true),
  ('hr-role', 'default', 'HR Admin', 'HR module access', true),
  ('manager-role', 'default', 'Manager', 'Team management access', true),
  ('employee-role', 'default', 'Employee', 'Self-service only', true)
ON CONFLICT DO NOTHING;

-- Audit log immutability (F-07): the application role must never be able to
-- UPDATE/DELETE audit entries. Adjust the role name to match the runtime DB role.
-- NOTE: table owners bypass REVOKE; ensure the app connects as a non-owner role
-- and grant only INSERT/SELECT on "AuditLog".
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;
