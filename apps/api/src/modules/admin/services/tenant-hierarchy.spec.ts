import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('TenantService - Hierarchy', () => {
  let service: TenantService;
  const mockPrisma: any = {
    tenant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TenantService>(TenantService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create with parentTenantId', () => {
    it('creates a child tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrisma.tenant.create.mockResolvedValue({ id: 'child-1', name: 'Branch A', parentTenantId: 'parent-1' });

      const result = await service.create({ name: 'Branch A', parentTenantId: 'parent-1' });
      expect(result).toMatchObject({ id: 'child-1', parentTenantId: 'parent-1' });
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Branch A', parentTenantId: 'parent-1' }),
      });
    });
  });

  describe('update parentTenantId', () => {
    it('updates parent', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1', name: 'T1' });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'parent-1', parentTenantId: null });
      mockPrisma.tenant.update.mockResolvedValue({ id: 't1', parentTenantId: 'parent-1' });

      const result = await service.update('t1', { parentTenantId: 'parent-1' });
      expect(result).toMatchObject({ parentTenantId: 'parent-1' });
    });

    it('rejects cycle: cannot set descendant as parent', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1', name: 'T1' });
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({ id: 'child-1', parentTenantId: 't1' })
        .mockResolvedValueOnce({ id: 'grandchild-1', parentTenantId: 'child-1' });

      await expect(
        service.update('t1', { parentTenantId: 'grandchild-1' }),
      ).rejects.toThrow('cycle');
    });

    it('allows null to detach from parent', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1', name: 'T1' });
      mockPrisma.tenant.update.mockResolvedValue({ id: 't1', parentTenantId: null });

      const result = await service.update('t1', { parentTenantId: null });
      expect(result).toMatchObject({ parentTenantId: null });
    });
  });

  describe('getHierarchy', () => {
    it('returns nested tree', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'root', name: 'Holding' });
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'root', name: 'Holding', parentTenantId: null },
        { id: 'child-a', name: 'Branch A', parentTenantId: 'root' },
        { id: 'child-b', name: 'Branch B', parentTenantId: 'root' },
        { id: 'grandchild', name: 'Site 1', parentTenantId: 'child-a' },
      ]);

      const tree = await service.getHierarchy('root');
      expect(tree.name).toBe('Holding');
      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].name).toBe('Branch A');
      expect(tree.children[0].children[0].name).toBe('Site 1');
    });
  });

  describe('getDescendants', () => {
    it('returns flattened list with depth', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'root', name: 'Holding' });
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'root', name: 'Holding', parentTenantId: null },
        { id: 'child-a', name: 'Branch A', parentTenantId: 'root' },
        { id: 'grandchild', name: 'Site 1', parentTenantId: 'child-a' },
      ]);

      const descendants = await service.getDescendants('root');
      expect(descendants).toHaveLength(2);
      expect(descendants[0]).toMatchObject({ id: 'child-a', depth: 1 });
      expect(descendants[1]).toMatchObject({ id: 'grandchild', depth: 2 });
    });
  });
});
