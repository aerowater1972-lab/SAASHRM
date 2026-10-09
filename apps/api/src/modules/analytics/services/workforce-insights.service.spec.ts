import { Test, TestingModule } from '@nestjs/testing';
import { WorkforceInsightsService } from './workforce-insights.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('WorkforceInsightsService', () => {
  let service: WorkforceInsightsService;
  const mockPrisma: any = {
    attendanceRecord: { count: jest.fn(), groupBy: jest.fn() },
    employment: { findMany: jest.fn(), count: jest.fn() },
    employee: { findMany: jest.fn(), count: jest.fn() },
    leaveBalance: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkforceInsightsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<WorkforceInsightsService>(WorkforceInsightsService);
  });

  afterEach(() => jest.clearAllMocks());

  const quietDefaults = () => {
    mockPrisma.attendanceRecord.count.mockResolvedValue(0);
    mockPrisma.attendanceRecord.groupBy.mockResolvedValue([]);
    mockPrisma.employment.findMany.mockResolvedValue([]);
    mockPrisma.employment.count.mockResolvedValue(0);
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.employee.count.mockResolvedValue(50);
    mockPrisma.leaveBalance.findMany.mockResolvedValue([]);
  };

  it('always emits headcount summary, sorted critical-first', async () => {
    quietDefaults();
    const res = await service.getInsights('t1');
    expect(res.generatedAt).toBeTruthy();
    expect(res.signals.map((s) => s.key)).toContain('headcount_summary');
    expect(res.signals[res.signals.length - 1].severity).toBe('info');
  });

  it('flags late spike with explainable delta', async () => {
    quietDefaults();
    mockPrisma.attendanceRecord.count.mockImplementation((args: any) =>
      Promise.resolve(args.where.status === 'LATE' ? (args.where.date.gte.getMonth() === new Date().getMonth() ? 12 : 4) : 0),
    );
    mockPrisma.attendanceRecord.groupBy.mockResolvedValue([{ employeeId: 'e-1', _count: { employeeId: 6 } }]);
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'e-1', fullName: 'Budi' }]);
    const res = await service.getInsights('t1');
    const sig = res.signals.find((s) => s.key === 'late_spike');
    expect(sig).toBeDefined();
    expect(sig!.detail).toContain('12');
    expect(sig!.detail).toContain('+200%');
    expect(sig!.items[0]).toMatchObject({ name: 'Budi', lateCount: 6 });
  });

  it('no spike without minimum volume (noise guard)', async () => {
    quietDefaults();
    mockPrisma.attendanceRecord.count.mockImplementation((args: any) =>
      Promise.resolve(args.where.status === 'LATE' ? 2 : 0),
    );
    const res = await service.getInsights('t1');
    expect(res.signals.some((s) => s.key === 'late_spike')).toBe(false);
  });

  it('lists expiring contracts with dates', async () => {
    quietDefaults();
    mockPrisma.employment.findMany.mockResolvedValue([
      { employee: { fullName: 'Siti' }, type: 'CONTRACT', endDate: new Date('2026-11-20') },
    ]);
    mockPrisma.employment.count.mockResolvedValue(1);
    const res = await service.getInsights('t1');
    const sig = res.signals.find((s) => s.key === 'contracts_expiring');
    expect(sig?.count).toBe(1);
    expect(sig?.items[0]).toMatchObject({ name: 'Siti', endDate: '2026-11-20' });
  });

  it('surfaces leave liability top holders', async () => {
    quietDefaults();
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      { employee: { fullName: 'A' }, leaveType: { name: 'Tahunan' }, totalEntitled: 12, carryForward: 6, totalUsed: 2, totalPending: 0, debtCarry: 0 },
      { employee: { fullName: 'B' }, leaveType: { name: 'Tahunan' }, totalEntitled: 12, carryForward: 0, totalUsed: 11, totalPending: 0, debtCarry: 0 },
    ]);
    const res = await service.getInsights('t1');
    const sig = res.signals.find((s) => s.key === 'leave_liability');
    expect(sig?.items).toHaveLength(1);
    expect(sig?.items[0]).toMatchObject({ name: 'A', available: 16 });
  });

  it('flags unreviewed spoof backlog', async () => {
    quietDefaults();
    mockPrisma.attendanceRecord.count.mockImplementation((args: any) =>
      Promise.resolve(args.where?.isSuspicious ? 12 : 0),
    );
    const res = await service.getInsights('t1');
    const sig = res.signals.find((s) => s.key === 'spoof_backlog');
    expect(sig?.severity).toBe('critical');
    expect(sig?.count).toBe(12);
  });
});
