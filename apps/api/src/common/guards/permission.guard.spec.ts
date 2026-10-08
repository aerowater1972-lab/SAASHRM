import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard (server-resolved permissions)', () => {
  const makeCtx = (user: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as any;

  const resolverFor = (permissions: string[]) => ({
    resolve: jest.fn().mockResolvedValue(permissions),
  });

  it('allows when the resolved set contains a required permission', async () => {
    const resolver = resolverFor(['admin:audit:read', 'admin:audit:export']);
    const guard = new PermissionGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(['admin:audit:read']) } as any,
      resolver as any,
    );
    await expect(guard.canActivate(makeCtx({ sub: 'u-allow' }))).resolves.toBe(true);
  });

  it('denies when the resolved set lacks all required permissions (ignores stale token list)', async () => {
    const resolver = resolverFor(['other:scope']);
    const guard = new PermissionGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(['admin:audit:read']) } as any,
      resolver as any,
    );
    // Even if the token still carries the permission, the fresh lookup wins.
    await expect(
      guard.canActivate(makeCtx({ sub: 'u-deny', permissions: ['admin:audit:read'] })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('attaches the resolved list to the request user', async () => {
    const resolver = resolverFor(['a:b']);
    const guard = new PermissionGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(['a:b']) } as any,
      resolver as any,
    );
    const user: any = { sub: 'u-attach' };
    await guard.canActivate(makeCtx(user));
    expect(user.permissions).toEqual(['a:b']);
  });

  it('passes through when no permissions are required', async () => {
    const resolver = resolverFor([]);
    const guard = new PermissionGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any,
      resolver as any,
    );
    await expect(guard.canActivate(makeCtx({ sub: 'u-open' }))).resolves.toBe(true);
    expect(resolver.resolve).not.toHaveBeenCalled();
  });
});
