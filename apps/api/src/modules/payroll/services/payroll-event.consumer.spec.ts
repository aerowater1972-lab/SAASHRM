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

  it('HARI_KERJA 180min -> multiplier x5.5 (1.5x first + 2x rest)', async () => {
    await run([{ id: 'r1', payableMinutes: 180, dayType: 'HARI_KERJA', isPaid: true }]);
    const call = mockAdjustments.create.mock.calls[0][0];
    expect(call.type).toBe('EARNING');
    expect(call.description).toContain('x5.5');
    const hourly = 4_000_000 / 173;
    expect(call.amount).toBe(Math.round(3 * hourly * 5.5));
  });

  it('HARI_LIBUR_RESM 120min -> multiplier x2', async () => {
    await run([{ id: 'r2', payableMinutes: 120, dayType: 'HARI_LIBUR_RESM', isPaid: true }]);
    const call = mockAdjustments.create.mock.calls[0][0];
    expect(call.description).toContain('x2');
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
});
