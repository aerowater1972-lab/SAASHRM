import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('RoleService (SEC-002: 3-segment permission keys)', () => {
  let service: RoleService;
  let prisma: any;

  const mockPrisma = {
    role: { findFirst: jest.fn() },
    permission: { findMany: jest.fn(), createMany: jest.fn() },
    rolePermission: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(RoleService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('maps admin:audit:read to { module: admin:audit, action: read } (not truncated)', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'role-1', tenantId: 'default' });
    // First lookup finds nothing -> triggers createMany for missing keys.
    prisma.permission.findMany.mockResolvedValueOnce([]);
    prisma.rolePermission.findMany.mockResolvedValue([]);
    prisma.permission.findMany.mockResolvedValueOnce([
      { id: 'perm-1', module: 'admin:audit', action: 'read' },
    ]);

    await service.assignPermissions('default', 'role-1', {
      permissionKeys: ['admin:audit:read'],
    } as any);

    // Lookup must use the full namespace, not { module: 'admin', action: 'audit' }.
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      where: { OR: [{ module: 'admin:audit', action: 'read' }] },
    });
    // Missing rows must be created with the same 3-segment split.
    expect(prisma.permission.createMany).toHaveBeenCalledWith({
      data: [{ module: 'admin:audit', action: 'read' }],
      skipDuplicates: true,
    });
  });

  it('round-trips seed-format keys: stored module:action rejoin to the requested key', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'role-1', tenantId: 'default' });
    prisma.permission.findMany.mockResolvedValue([
      { id: 'perm-1', module: 'admin:audit', action: 'read' },
    ]);
    prisma.rolePermission.findMany.mockResolvedValue([]);
    prisma.rolePermission.createMany.mockResolvedValue({ count: 1 });

    await service.assignPermissions('default', 'role-1', {
      permissionKeys: ['admin:audit:read'],
    } as any);

    // Nothing missing -> no corrupt rows created.
    expect(prisma.permission.createMany).not.toHaveBeenCalled();
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'role-1', permissionId: 'perm-1', scope: 'ALL' }],
      skipDuplicates: true,
    });
  });
});
