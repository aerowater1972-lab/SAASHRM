import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AIAnalyticsService } from './services/ai-analytics.service';

describe('AIAnalyticsService.notifyHighRisk (AI-07)', () => {
  const TENANT = 't-1';

  const setup = async (prisma: any, notification: any) => {
    const mod = await Test.createTestingModule({
      providers: [
        AIAnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notification },
      ],
    }).compile();
    return mod.get(AIAnalyticsService);
  };

  const highSignal = (id: string) => ({
    employeeId: id,
    employeeName: 'Karyawan ' + id,
    riskScore: 0.8,
    riskLevel: 'HIGH' as const,
    factors: [],
    recommendation: 'Lakukan 1-on-1',
    windowDays: 90,
  });

  it('mengirim ke HR admin bila ada sinyal HIGH dan belum diingatkan', async () => {
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'hr-1' }]) },
      notification: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const notification = { send: jest.fn().mockResolvedValue(undefined) };
    const svc = await setup(prisma, notification);
    jest.spyOn(svc, 'predictDisengagement').mockResolvedValue([highSignal('e-1')] as any);
    const sent = await svc.notifyHighRisk(TENANT);
    expect(sent).toBe(1);
    expect(notification.send).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT, userId: 'hr-1', templateKey: 'ai.high-risk.e-1' }),
    );
  });

  it('tidak mengirim ulang bila sudah ada notifikasi 24 jam terakhir', async () => {
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'hr-1' }]) },
      notification: { findFirst: jest.fn().mockResolvedValue({ id: 'n-1' }) },
    };
    const notification = { send: jest.fn().mockResolvedValue(undefined) };
    const svc = await setup(prisma, notification);
    jest.spyOn(svc, 'predictDisengagement').mockResolvedValue([highSignal('e-1')] as any);
    const sent = await svc.notifyHighRisk(TENANT);
    expect(sent).toBe(0);
    expect(notification.send).not.toHaveBeenCalled();
  });

  it('mengembalikan 0 bila tidak ada sinyal HIGH/CRITICAL', async () => {
    const prisma: any = {
      user: { findMany: jest.fn() },
      notification: { findFirst: jest.fn() },
    };
    const notification = { send: jest.fn() };
    const svc = await setup(prisma, notification);
    jest.spyOn(svc, 'predictDisengagement').mockResolvedValue([
      { ...highSignal('e-1'), riskLevel: 'LOW', riskScore: 0.05 },
    ] as any);
    const sent = await svc.notifyHighRisk(TENANT);
    expect(sent).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
