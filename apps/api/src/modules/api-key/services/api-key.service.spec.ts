import { ApiKeyService } from './api-key.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      apiKey: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ApiKeyService(prisma);
  });

  describe('create', () => {
    it('rejects when the tenant already has 10 active keys (UAT OA-02-03)', async () => {
      prisma.apiKey.count.mockResolvedValue(10);
      await expect(service.create({ name: 'key-11' }, 't1')).rejects.toThrow(BadRequestException);
      expect(prisma.apiKey.count).toHaveBeenCalledWith({
        where: { tenantId: 't1', deletedAt: null, isActive: true },
      });
      expect(prisma.apiKey.create).not.toHaveBeenCalled();
    });

    it('stores a SHA-256 hash, 12-char prefix, and never returns the full key (UAT OA-02-01/06)', async () => {
      prisma.apiKey.count.mockResolvedValue(3);
      prisma.apiKey.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'k1', lastUsedAt: null, createdAt: new Date(), ...data }),
      );

      const result = await service.create(
        { name: 'ci-key', scopes: ['slack:write'] },
        't1',
      );

      const created = prisma.apiKey.create.mock.calls[0][0].data;
      expect(created.keyHash).toMatch(/^[a-f0-9]{64}$/);
      expect(created.keyPrefix).toHaveLength(12);
      expect(created.tenantId).toBe('t1');
      expect(created.scopes).toEqual(['slack:write']);
      expect(result.keyPrefix).toBe(created.keyPrefix);
      expect(result).not.toHaveProperty('key');
      expect(result).not.toHaveProperty('keyHash');
    });
  });

  describe('verify', () => {
    it('returns the record and updates lastUsedAt for a valid key (UAT OA-02-04)', async () => {
      const record = {
        id: 'k1',
        tenantId: 't1',
        keyPrefix: 'abc123def456',
        scopes: ['slack:write'],
        expiresAt: null,
      };
      prisma.apiKey.findFirst.mockResolvedValue(record);

      const result = await service.verify('raw-key');

      expect(result).toBe(record);
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: { keyHash: expect.any(String), deletedAt: null, isActive: true },
      });
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('returns null for an unknown key (UAT OA-02-05)', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(service.verify('bad-key')).resolves.toBeNull();
    });

    it('returns null for an expired key (UAT OA-02-10)', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'k1',
        keyPrefix: 'abc123def456',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.verify('expired-key')).resolves.toBeNull();
      expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('renames the key and updates scopes/expiry (UAT OA-02-07)', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', tenantId: 't1' });
      prisma.apiKey.update.mockResolvedValue({ id: 'k1', name: 'renamed' });

      await service.update('k1', { name: 'renamed', scopes: ['slack:notice'] }, 't1');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { name: 'renamed', scopes: ['slack:notice'] },
      });
    });

    it('throws when the key is not found in the tenant', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(service.update('nope', { name: 'x' }, 't1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('deactivates the key (UAT OA-02-02)', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', tenantId: 't1' });
      prisma.apiKey.update.mockResolvedValue({ id: 'k1', isActive: false });

      await service.revoke('k1', 't1');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { isActive: false, deletedAt: null },
      });
    });

    it('soft-deletes when a reason is provided', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', tenantId: 't1' });
      prisma.apiKey.update.mockResolvedValue({ id: 'k1', isActive: false });

      await service.revoke('k1', 't1', 'leaked in chat');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { isActive: false, deletedAt: expect.any(Date) },
      });
    });
  });

  describe('remove', () => {
    it('hard-deletes the key (UAT OA-02-09)', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', tenantId: 't1' });
      prisma.apiKey.delete.mockResolvedValue({ id: 'k1' });

      await service.remove('k1', 't1');

      expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
    });
  });

  describe('list', () => {
    it('findAll scopes to the tenant and excludes deleted keys', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);
      await service.findAll('t1');
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('findActive filters isActive: true', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);
      await service.findActive('t1');
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', deletedAt: null, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
