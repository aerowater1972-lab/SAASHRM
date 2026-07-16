import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Bind tenant to the authenticated principal; only fall back to the header
    // for genuinely unauthenticated (public) contexts. Never let a client
    // header override an authenticated user's tenant (cross-tenant bypass).
    return request.user?.tenantId ?? request.headers['x-tenant-id'] ?? 'default';
  },
);
