import { Test, TestingModule } from '@nestjs/testing';
import { PayrollEventConsumer } from './payroll-event.consumer';
import { PrismaService } from '@common/prisma/prisma.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';

describe('PayrollEventConsumer - overtime BR-10', () => {
  let service: PayrollEventConsumer;
  let prisma: any;
  let adjustments: any;

  const mockPrisma = {
    employment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    grade: {
      findUnique: jest.fn(),
    },
    overtimeRecord: {
      findMany: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockAdjustments = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockRegistry = {
    register: jest.fn(),
  };

  // grade.level 4 -> baseSalary 4,000,000 -> hourly = 4,000,000 / 173
  const employment = { id: 'e-1', grade: { level: 4 } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEventConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
        { provide: JobHandlerRegistry, useValue: mockRegistry },
      ],
    }).compile();

    service = module.get<PayrollEventConsumer>(PayrollEventConsumer);
    prisma = module.get(PrismaService);
    adjustments = module.get(PayrollAdjustmentService);
  });

  afterEach(() => jest.clearAllMocks());

  const run = (records: any[]) => {
    mockPrisma.employment.findFirst.mockResolvedValue(employment);
    // honor the isPaid:true filter the real query applies
    mockPrisma.overtimeRecord.findMany.mockImplementation((args: any) =>
      Promise.resolve((args?.where?.isPaid === true ? records.filter((r) => r.isPaid) : records)),
    );
    return (service as any).handleAttendancePeriodClosed('default', {
      employeeId: 'emp-1',
      period: 'Jul-2026',
      periodStart: '2026-07-01T00:00:00.000Z',
      periodEnd: '2026-07-31T00:00:00.000Z',
      overtimeMinutes: 0,
      lateCount: 0,
    });
  };

  it('HARI_KERJA 180min -> 5.5 jam-upah (1.5x jam-1 + 2x sisanya)', async () => {
    await run([{ id: 'r1', payableMinutes: 180, dayType: 'HARI_KERJA', isPaid: true }]);
    const call = mockAdjustments.create.mock.calls[0][0];
    expect(call.type).toBe('EARNING');
    expect(call.description).toContain('5.5 jam-upah');
    const hourly = 4_000_000 / 173;
    expect(call.amount).toBe(Math.round(hourly * 5.5));
  });

  it('HARI_LIBUR_RESM 120min -> multiplier 2x', async () => {
    await run([{ id: 'r2', payableMinutes: 120, dayType: 'HARI_LIBUR_RESM', isPaid: true }]);
    const call = mockAdjustments.create.mock.calls[0][0];
    expect(call.description).toContain('2x');
    const hourly = 4_000_000 / 173;
    expect(call.amount).toBe(Math.round(2 * hourly * 2));
  });

  it('skips records with isPaid=false (FR-20 default off)', async () => {
    await run([{ id: 'r3', payableMinutes: 120, dayType: 'HARI_KERJA', isPaid: false }]);
    expect(mockAdjustments.create).not.toHaveBeenCalled();
  });

  it('skips when employee has no employment (hourlyRate 0)', async () => {
    mockPrisma.employment.findFirst.mockResolvedValue(null);
    mockPrisma.overtimeRecord.findMany.mockResolvedValue([{ id: 'r4', payableMinutes: 180, dayType: 'HARI_KERJA', isPaid: true }]);
    await (service as any).handleAttendancePeriodClosed('default', {
      employeeId: 'emp-1', period: 'Jul-2026',
      periodStart: '2026-07-01T00:00:00.000Z', periodEnd: '2026-07-31T00:00:00.000Z',
    });
    expect(mockAdjustments.create).not.toHaveBeenCalled();
  });

  it('tidak double-pay: record detail menang, fallback flat diabaikan', async () => {
    mockPrisma.employment.findFirst.mockResolvedValue({ id: 'e-1', grade: { level: 4 } });
    mockPrisma.overtimeRecord.findMany.mockResolvedValue([
      { id: 'r5', payableMinutes: 60, dayType: 'HARI_KERJA', isPaid: true },
    ]);
    await (service as any).handleAttendancePeriodClosed('default', {
      employeeId: 'emp-1', period: 'Jul-2026',
      periodStart: '2026-07-01T00:00:00.000Z', periodEnd: '2026-07-31T00:00:00.000Z',
      overtimeMinutes: 600,
    });
    expect(mockAdjustments.create).toHaveBeenCalledTimes(1);
    expect(mockAdjustments.create.mock.calls[0][0].referenceId).toContain('r5');
  });
});

describe('PayrollEventConsumer - rapel on retroactive grade change', () => {
  let service: PayrollEventConsumer;

  const mockPrisma = {
    employment: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    grade: { findUnique: jest.fn() },
  };
  const mockAdjustments = { create: jest.fn().mockResolvedValue({}) };

  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString();
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEventConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
        { provide: JobHandlerRegistry, useValue: { register: jest.fn() } },
      ],
    }).compile();

    service = module.get<PayrollEventConsumer>(PayrollEventConsumer);
    mockPrisma.employment.findFirst.mockResolvedValue({ id: 'e-1' });
  });

  afterEach(() => jest.clearAllMocks());

  const gradeChange = (effectiveDate: string) =>
    (service as any).handleGradeChanged('default', {
      employeeId: 'emp-1',
      oldGradeId: 'g-old',
      newGradeId: 'g-new',
      effectiveDate,
    });

  beforeEach(() => {
    mockPrisma.grade.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'g-old') return Promise.resolve({ level: 4 });
      if (where.id === 'g-new') return Promise.resolve({ level: 5 });
      return Promise.resolve(null);
    });
  });

  it('rapel 3 bulan x selisih 1jt untuk kenaikan berlaku surut', async () => {
    await gradeChange(monthsAgo(3));

    const rapel = mockAdjustments.create.mock.calls.find((c: any[]) => c[0].type === 'EARNING');
    expect(rapel).toBeDefined();
    expect(rapel[0].amount).toBe(3000000);
    expect(rapel[0].referenceId).toContain(':rapel');
  });

  it('tanpa rapel bila efektif kemarin (belum ada bulan penuh terlewat)', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    await gradeChange(yesterday);

    const earnings = mockAdjustments.create.mock.calls.filter((c: any[]) => c[0].type === 'EARNING');
    expect(earnings).toHaveLength(0);
    // penanda SALARY_UPDATE tetap dibuat
    expect(mockAdjustments.create).toHaveBeenCalledTimes(1);
  });

  it('tanpa rapel untuk penurunan grade', async () => {
    mockPrisma.grade.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'g-old') return Promise.resolve({ level: 5 });
      return Promise.resolve({ level: 4 });
    });
    await gradeChange(monthsAgo(3));

    const earnings = mockAdjustments.create.mock.calls.filter((c: any[]) => c[0].type === 'EARNING');
    expect(earnings).toHaveLength(0);
  });
});
