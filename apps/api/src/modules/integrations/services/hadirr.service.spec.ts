import { Test, TestingModule } from '@nestjs/testing';
import { HadirrService } from './hadirr.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

describe('HadirrService', () => {
  let service: HadirrService;
  const mockPrisma: any = {
    tenant: { findFirst: jest.fn() },
    employee: { findFirst: jest.fn() },
    attendanceRecord: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    biometricDevice: { findFirst: jest.fn(), create: jest.fn() },
  };

  const secret = 'test-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HadirrService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: (key: string, def: any) => (key === 'HADIRR_WEBHOOK_SECRET' ? secret : def) } },
      ],
    }).compile();
    service = module.get<HadirrService>(HadirrService);
  });

  afterEach(() => jest.clearAllMocks());

  const sign = (payload: any) =>
    createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  const basePayload = (overrides: any = {}) => ({
    deviceId: 'HADIRR-001',
    tenantCode: 'acme',
    timestamp: '2026-10-09T08:00:00Z',
    items: [{ employeeId: 'EMP-001', timestamp: '2026-10-09T08:00:00Z', direction: 'IN' }],
    ...overrides,
  });

  it('rejects invalid signature', async () => {
    await expect(
      service.handleWebhook(basePayload(), 'bad-sig'),
    ).rejects.toThrow('Invalid webhook signature');
  });

  it('rejects unknown tenant', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    await expect(
      service.handleWebhook(basePayload(), sign(basePayload())),
    ).rejects.toThrow('Unknown tenant');
  });

  it('ingests clock-in for new employee', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1' });
    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
    mockPrisma.biometricDevice.findFirst.mockResolvedValue(null);
    mockPrisma.biometricDevice.create.mockResolvedValue({ id: 'd1' });
    mockPrisma.attendanceRecord.create.mockResolvedValue({ id: 'a1' });

    const result = await service.handleWebhook(basePayload(), sign(basePayload()));
    expect(result.ingested).toBe(1);
    expect(mockPrisma.attendanceRecord.create).toHaveBeenCalled();
  });

  it('updates clock-out for existing record', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1' });
    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    mockPrisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'a1', clockOut: null });
    mockPrisma.biometricDevice.findFirst.mockResolvedValue({ id: 'd1' });

    const payload = basePayload({
      items: [{ employeeId: 'EMP-001', timestamp: '2026-10-09T17:00:00Z', direction: 'OUT' }],
    });

    const result = await service.handleWebhook(payload, sign(payload));
    expect(result.ingested).toBe(1);
    expect(mockPrisma.attendanceRecord.update).toHaveBeenCalled();
  });

  it('skips duplicate clock-in', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: 't1' });
    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    mockPrisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'a1', clockIn: new Date() });
    mockPrisma.biometricDevice.findFirst.mockResolvedValue({ id: 'd1' });

    const result = await service.handleWebhook(basePayload(), sign(basePayload()));
    expect(result.skipped).toBe(1);
  });

  it('syncAttendance returns formatted records', async () => {
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([
      { employee: { fullName: 'Budi' }, date: new Date('2026-10-01'), clockIn: new Date(), clockOut: new Date(), status: 'PRESENT' },
    ]);

    const result = await service.syncAttendance('t1', new Date('2026-10-01'), new Date('2026-10-31'));
    expect(result.total).toBe(1);
    expect(result.records[0].employee).toBe('Budi');
  });
});
