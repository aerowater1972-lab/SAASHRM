import { PermissionsResolver } from './permissions.resolver';

describe('PermissionsResolver', () => {
  const rowsFor = (keys: string[]) => ({
    userRole: {
      findMany: jest.fn().mockResolvedValue(
        keys.map((key) => {
          const idx = key.lastIndexOf(':');
          return {
            role: {
              rolePermissions: [
                { permission: { module: key.slice(0, idx), action: key.slice(idx + 1) } },
              ],
            },
          };
        }),
      ),
    },
  });

  it('joins module:action across roles and dedupes', async () => {
    const resolver = new PermissionsResolver(rowsFor(['admin:audit:read', 'admin:audit:read', 'a:b']) as any);
    await expect(resolver.resolve('u-r1')).resolves.toEqual(['admin:audit:read', 'a:b']);
  });

  it('returns stale cache when the query fails', async () => {
    const prisma: any = rowsFor(['x:y']);
    const resolver = new PermissionsResolver(prisma);
    await resolver.resolve('u-r2');
    prisma.userRole.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(resolver.resolve('u-r2')).resolves.toEqual(['x:y']);
  });
});
