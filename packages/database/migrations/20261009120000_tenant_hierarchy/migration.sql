-- Multi-company hierarchy: parent-child tenant relationship.
ALTER TABLE "Tenant" ADD COLUMN "parentTenantId" TEXT;

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_parentTenantId_fkey"
  FOREIGN KEY ("parentTenantId") REFERENCES "Tenant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Tenant_parentTenantId_idx" ON "Tenant"("parentTenantId");
