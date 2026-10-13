import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LiveTrackingService } from './live-tracking.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { MailService } from '@modules/integrations/services/mail.service';

const TENANT = 't-1';

// Square-ish polygon around (0,0) roughly 1 degree per side for inside tests.
const POLY = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
});

describe('LiveTrackingService - territory violation notification', () => {
  const buildPrisma = (over: any = {}) => ({
    employee: { findFirst: jest.fn() },
    locationPing: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ping-1', ...data })), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    fieldTerritory: { findFirst: jest.fn() },
    territoryViolation: {
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'v-1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'v-1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    ...over,
  });

  const makeService = async (prisma: any, opts: { notif?: any; mail?: any } = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { ingest: jest.fn() } },
        { provide: NotificationService, useValue: opts.notif ?? { send: jest.fn() } },
        { provide: MailService, useValue: opts.mail ?? { sendMail: jest.fn() } },
      ],
    }).compile();
    return module.get<LiveTrackingService>(LiveTrackingService);
  };

  afterEach(() => jest.clearAllMocks());

  it('ping di dalam wilayah: tidak membuat pelanggaran / notifikasi', async () => {
    const prisma = buildPrisma();
    prisma.employee.findFirst.mockResolvedValue({ id: 'e-1', isFieldWorker: true, status: 'ACTIVE' });
    prisma.fieldTerritory.findFirst.mockResolvedValue({ id: 'ter-1', territoryName: 'Jaksel', boundaryGeoJson: POLY, employee: { fullName: 'Budi' } });
    const notif = { send: jest.fn() };
    const svc = await makeService(prisma, { notif });
    await svc.recordLocationPing(TENANT, 'e-1', { lat: 0, lng: 0 });
    expect(prisma.territoryViolation.create).not.toHaveBeenCalled();
    expect(notif.send).not.toHaveBeenCalled();
  });

  it('ping di luar wilayah: membuat pelanggaran + notifikasi HR + set notified', async () => {
    const prisma = buildPrisma();
    prisma.employee.findFirst.mockResolvedValue({ id: 'e-1', isFieldWorker: true, status: 'ACTIVE' });
    prisma.fieldTerritory.findFirst.mockResolvedValue({ id: 'ter-1', territoryName: 'Jaksel', boundaryGeoJson: POLY, employee: { fullName: 'Budi' } });
    prisma.user = { findMany: jest.fn().mockResolvedValue([{ id: 'u-1', email: 'hr@x.id' }]) };
    const notif = { send: jest.fn() };
    const mail = { sendMail: jest.fn() };
    const svc = await makeService(prisma, { notif, mail });
    await svc.recordLocationPing(TENANT, 'e-1', { lat: 5, lng: 5 });
    expect(prisma.territoryViolation.create).toHaveBeenCalled();
    expect(notif.send).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-1', templateKey: 'attendance.territory.violation' }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'hr@x.id' }));
    expect(prisma.territoryViolation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { notified: true } }));
  });

  it('kegagalan notifikasi tidak menggagalkan pencatatan ping', async () => {
    const prisma = buildPrisma();
    prisma.employee.findFirst.mockResolvedValue({ id: 'e-1', isFieldWorker: true, status: 'ACTIVE' });
    prisma.fieldTerritory.findFirst.mockResolvedValue({ id: 'ter-1', territoryName: 'Jaksel', boundaryGeoJson: POLY, employee: { fullName: 'Budi' } });
    prisma.user = { findMany: jest.fn().mockResolvedValue([{ id: 'u-1', email: 'hr@x.id' }]) };
    const notif = { send: jest.fn().mockRejectedValue(new Error('DB down')) };
    const svc = await makeService(prisma, { notif });
    const res: any = await svc.recordLocationPing(TENANT, 'e-1', { lat: 5, lng: 5 });
    expect(res.id).toBe('ping-1'); // ping tetap tersimpan
    expect(prisma.territoryViolation.update).not.toHaveBeenCalled(); // notified tidak di-set
  });

  it('non-field-worker ditolak', async () => {
    const prisma = buildPrisma();
    prisma.employee.findFirst.mockResolvedValue({ id: 'e-1', isFieldWorker: false, status: 'ACTIVE' });
    const svc = await makeService(prisma);
    await expect(svc.recordLocationPing(TENANT, 'e-1', { lat: 0, lng: 0 })).rejects.toThrow(BadRequestException);
  });

  it('listViolations: meneruskan filter notified + paginasi', async () => {
    const prisma = buildPrisma();
    const svc = await makeService(prisma);
    await svc.listViolations(TENANT, { notified: false, limit: 10, page: 2 });
    expect(prisma.territoryViolation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT, notified: false }),
        skip: 10,
        take: 10,
      }),
    );
  });
});
