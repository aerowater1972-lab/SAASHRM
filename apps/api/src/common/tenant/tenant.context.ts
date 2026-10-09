import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<string>();
const tenantScopeStorage = new AsyncLocalStorage<string[]>();

/**
 * Binds the current request's tenant to the async context so that the
 * Prisma RLS middleware (when DB_RLS_ENABLED=true) can SET the
 * app.current_tenant GUC for the duration of each database operation.
 *
 * setTenant is called from AuthGuard/TenantInterceptor; getTenant is read
 * inside the Prisma middleware. When unset (e.g. background jobs, public
 * endpoints), getTenant() returns undefined and RLS policies fall back to
 * their NULL-permissive branch (see scripts/rls.sql).
 *
 * For multi-company hierarchy, setTenantScope can be used to bind a list of
 * tenant IDs that the current user is allowed to access (e.g. parent tenant
 * viewing child tenant data). getTenantScope returns this list.
 */
export function setTenant(tenantId: string | undefined | null): void {
  if (tenantId) {
    tenantStorage.enterWith(tenantId);
  }
}

export function getTenant(): string | undefined {
  return tenantStorage.getStore();
}

export function setTenantScope(tenantIds: string[] | undefined | null): void {
  if (tenantIds && tenantIds.length > 0) {
    tenantScopeStorage.enterWith(tenantIds);
  }
}

export function getTenantScope(): string[] | undefined {
  return tenantScopeStorage.getStore();
}
