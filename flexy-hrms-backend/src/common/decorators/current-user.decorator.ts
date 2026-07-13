import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  roles: string[];
}

/**
 * Mengambil user context dari request (diisi oleh JwtStrategy setelah
 * validasi token — lihat modules/system-administration/authz).
 *
 * Contoh: createEmployee(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
