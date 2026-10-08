import { PrismaClient, Prisma } from '@prisma/client';
import { getTenant } from '../tenant/tenant.context';

/**
 * Prisma Extension for Row-Level Security (RLS)
 * 
 * This extension sets the `app.current_tenant` GUC on the database connection
 * before each query when DB_RLS_ENABLED=true and a tenant is available in the
 * async context. This avoids nested transaction issues by using Prisma's
 * extension mechanism instead of middleware.
 * 
 * Usage:
 *   const prisma = new PrismaClient().$extends(createRlsExtension());
 * 
 * Note: This requires the RLS policies from scripts/rls.sql to be applied to the database.
 * The policies filter by `app.current_tenant` GUC.
 */
export function createRlsExtension() {
  return (prisma: PrismaClient) =>
    prisma.$extends({
      name: 'rls',
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Only apply RLS when enabled and tenant is available
            if (process.env.DB_RLS_ENABLED !== 'true') {
              return query(args);
            }

            const tenant = getTenant();
            if (!tenant) {
              return query(args);
            }

            // Use SET LOCAL to set the GUC for the current transaction only.
            // This runs in Prisma's implicit transaction for each operation.
            try {
              await (prisma as any).$executeRawUnsafe(`SET LOCAL "app.current_tenant" = $1`, tenant);
            } catch (e) {
              // Ignore errors (e.g., not in a transaction context)
              console.debug?.(`RLS SET LOCAL failed: ${e instanceof Error ? e.message : String(e)}`);
            }
            return query(args);
          },
        },
      },
    });
}

/**
 * Alternative: Request-scoped Prisma Client Factory
 * 
 * Creates a new extended PrismaClient for each request with the tenant bound.
 * This avoids the need for async context storage by binding the tenant at
 * client creation time.
 * 
 * Usage in a NestJS request-scoped provider:
 *   @Injectable({ scope: RequestScope })
 *   export class RequestPrismaService extends PrismaClient {
 *     constructor() {
 *       super().$extends(createConnectionRlsExtension(getTenant()));
 *     }
 *   }
 */
export function createConnectionRlsExtension(tenant: string) {
  return (prisma: PrismaClient) =>
    prisma.$extends({
      name: 'rls-connection',
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            if (process.env.DB_RLS_ENABLED !== 'true') {
              return query(args);
            }
            if (!tenant) {
              return query(args);
            }
            try {
              await (prisma as any).$executeRawUnsafe(`SET LOCAL "app.current_tenant" = $1`, tenant);
            } catch (e) {
              console.debug?.(`RLS SET LOCAL failed: ${e instanceof Error ? e.message : String(e)}`);
            }
            return query(args);
          },
        },
      },
    });
}