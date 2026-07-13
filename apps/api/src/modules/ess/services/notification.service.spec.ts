import { Test, TestingModule } from '@nestjs/testing';
import { EssNotificationService } from './notification.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('EssNotificationService (BR-05)', () => {
  let service: EssNotificationService;
  const mockPrisma: any = {
    essNotification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EssNotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(EssNotificationService);
    jest.clearAllMocks();
  });

  it('getRetentionDays defaults to 90', () => {
    expect(service.getRetentionDays()).toBe(90);
  });

  it('excludes archived notifications from the default list', async () => {
    mockPrisma.essNotification.findMany.mockResolvedValue([]);
    await service.list('emp-1');
    expect(mockPrisma.essNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-1', archivedAt: null } }),
    );
  });

  it('archiveExpired archives notifications older than the retention window', async () => {
    const now = new Date('2025-06-01T00:00:00Z');
    mockPrisma.essNotification.updateMany.mockResolvedValue({ count: 3 });

    const count = await service.archiveExpired(now);

    expect(count).toBe(3);
    const call = mockPrisma.essNotification.updateMany.mock.calls[0][0];
    // 90-day retention -> cutoff
    expect(call.where.archivedAt).toBeNull();
    expect(call.where.createdAt.lt.getTime()).toBe(new Date('2025-03-03T00:00:00Z').getTime());
    expect(call.data.archivedAt).toBe(now);
  });
});
