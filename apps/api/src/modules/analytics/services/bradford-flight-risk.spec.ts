import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('AnalyticsService - Bradford & flight-risk', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    leaveRequest: { findMany: jest.fn() },
    disciplinaryCase: { findMany: jest.fn() },
    overtimeRecord: { findMany: jest.fn() },
    goal: { findMany: jest.fn() },
    individualDevelopmentPlan: { findMany: jest.fn() },
    employee: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  it('getOvertimeByGrade mengelompokkan jam/sesi/rata-rata per grade', async () => {
    const grade5 = { level: 5, name: 'Staff' };
    mockPrisma.overtimeRecord.findMany.mockResolvedValue([
      { employeeId: 'e-1', payableMinutes: 120, employee: { employments: [{ grade: grade5 }] } },
      { employeeId: 'e-1', payableMinutes: 60, employee: { employments: [{ grade: grade5 }] } },
      { employeeId: 'e-2', payableMinutes: 60, employee: { employments: [{ grade: grade5 }] } },
    ]);
    const res: any = await service.getOvertimeByGrade('t1', {} as any);
    expect(res.grades).toHaveLength(1);
    expect(res.grades[0].totalMinutes).toBe(240);
    expect(res.grades[0].sessions).toBe(3);
    expect(res.grades[0].employeeCount).toBe(2);
    expect(res.grades[0].avgMinutesPerEmployee).toBe(120);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('Bradford S^2 x D + band', async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([
      { employeeId: 'e-1', totalDays: 2, employee: { fullName: 'A', employeeId: 'E1' } },
      { employeeId: 'e-1', totalDays: 3, employee: { fullName: 'A', employeeId: 'E1' } },
    ]);
    const res: any = await service.getBradfordScores('t1', {} as any);
    // S=2, D=5 -> 20, LOW
    expect(res.scores[0].bradfordScore).toBe(20);
    expect(res.scores[0].band).toBe('LOW');
  });

  it('flight-risk HIGH dari SP3 + Bradford tinggi', async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => ({ employeeId: 'e-1', totalDays: 10, employee: { fullName: 'A', employeeId: 'E1' } })),
    );
    mockPrisma.disciplinaryCase.findMany.mockResolvedValue([{ employeeId: 'e-1', spLevel: 'SP3' }]);
    mockPrisma.overtimeRecord.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.individualDevelopmentPlan.findMany.mockResolvedValue([{ employeeId: 'e-1' }]);
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'e-1', fullName: 'A', employeeId: 'E1' }]);

    const res: any = await service.getFlightRisk('t1', {} as any);
    // Bradford 10^2*100=10000 (+35) + SP (+25) + SP3 (+10) = 70 -> HIGH
    expect(res.people[0].band).toBe('HIGH');
    expect(res.people[0].riskScore).toBe(70);
  });

  it('getLeaveSummary memecah utilisasi per departemen', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ department: 'Produksi', totalDays: 30, count: 5 }])
      .mockResolvedValueOnce([{ totalDays: 30, totalRequests: 5 }]);
    const res: any = await service.getLeaveSummary('t1', {} as any);
    expect(res.byDepartment).toEqual([{ department: 'Produksi', totalDays: 30, count: 5 }]);
    expect(res.totalDays).toBe(30);
  });

  it('export pdf menghasilkan PDF valid ber-encoding base64', async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
    const res: any = await service.exportReport('t1', 'u-1', { report: 'bradford', format: 'pdf' } as any);
    expect(res.contentType).toBe('application/pdf');
    expect(res.encoding).toBe('base64');
    const raw = Buffer.from(res.content, 'base64').toString('utf-8');
    expect(raw.startsWith('%PDF-1.4')).toBe(true);
  });
});
