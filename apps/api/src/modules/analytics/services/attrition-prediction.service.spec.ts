import { Test, TestingModule } from '@nestjs/testing';
import { AttritionPredictionService } from './attrition-prediction.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('AttritionPredictionService', () => {
  let service: AttritionPredictionService;
  const mockPrisma: any = {
    employee: { findMany: jest.fn(), findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttritionPredictionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AttritionPredictionService>(AttritionPredictionService);
  });

  afterEach(() => jest.clearAllMocks());

  const baseEmployee = (overrides: any = {}) => ({
    id: 'e1',
    fullName: 'Budi Santoso',
    attendanceRecords: [
      { status: 'PRESENT', lateMinutes: 0, overtimeMinutes: 0 },
      { status: 'PRESENT', lateMinutes: 0, overtimeMinutes: 0 },
      { status: 'PRESENT', lateMinutes: 0, overtimeMinutes: 0 },
    ],
    leaveBalances: [{ totalEntitled: 12, carryForward: 0, totalUsed: 2, totalPending: 0, debtCarry: 0 }],
    employments: [{ startDate: new Date('2024-01-01'), grade: { baseSalary: 8_000_000 } }],
    performanceReviews: [{ overallScore: 4 }],
    engagementSurveys: [{ overallScore: 4 }],
    disciplinaryCases: [],
    pipRecords: [],
    ...overrides,
  });

  it('predicts LOW risk for healthy employee', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([baseEmployee()]);
    const results = await service.predictBatch('t1');
    expect(results).toHaveLength(1);
    expect(results[0].riskLevel).toBe('LOW');
    expect(results[0].riskScore).toBeLessThan(0.2);
  });

it('predicts HIGH risk for at-risk employee', async () => {
    const atRisk = baseEmployee({
      attendanceRecords: [
        { status: 'LATE', lateMinutes: 60, overtimeMinutes: 120 },
        { status: 'LATE', lateMinutes: 45, overtimeMinutes: 90 },
        { status: 'ABSENT', lateMinutes: 0, overtimeMinutes: 0 },
        { status: 'LATE', lateMinutes: 30, overtimeMinutes: 60 },
      ],
      performanceReviews: [{ overallScore: 2 }],
      engagementSurveys: [{ overallScore: 2 }],
      disciplinaryCases: [{ status: 'OPEN' }],
    });
    mockPrisma.employee.findMany.mockResolvedValue([atRisk]);
    const results = await service.predictBatch('t1');
    expect(results[0].riskLevel).toBe('HIGH');
    expect(results[0].riskScore).toBeGreaterThanOrEqual(0.3);
  });

it('predicts CRITICAL risk for very high risk employee', async () => {
    const critical = baseEmployee({
      attendanceRecords: Array(15).fill({ status: 'ABSENT', lateMinutes: 0, overtimeMinutes: 0 }),
      performanceReviews: [{ overallScore: 1 }],
      engagementSurveys: [{ overallScore: 1 }],
      disciplinaryCases: [{ status: 'OPEN' }],
      pipRecords: [{ status: 'ACTIVE' }],
      employments: [{ startDate: new Date('2026-09-01'), grade: { baseSalary: 3_000_000 } }],
    });
    mockPrisma.employee.findMany.mockResolvedValue([critical]);
    const results = await service.predictBatch('t1');
    expect(results[0].riskLevel).toBe('CRITICAL');
    expect(results[0].riskScore).toBeGreaterThanOrEqual(0.5);
  });

  it('identifies top risk factors', async () => {
const atRisk = baseEmployee({
    attendanceRecords: [
      { status: 'LATE', lateMinutes: 60, overtimeMinutes: 0 },
      { status: 'LATE', lateMinutes: 30, overtimeMinutes: 0 },
    ],
    performanceReviews: [{ overallScore: 2 }],
  });
    mockPrisma.employee.findMany.mockResolvedValue([atRisk]);
    const results = await service.predictBatch('t1');
    expect(results[0].factors.length).toBeGreaterThan(0);
    expect(results[0].factors[0].factor).toBeDefined();
    expect(results[0].factors[0].impact).toBeGreaterThan(0);
  });

  it('sorts by risk score descending', async () => {
    const low = baseEmployee({ id: 'e1', fullName: 'Low Risk' });
    const high = baseEmployee({
      id: 'e2',
      fullName: 'High Risk',
      attendanceRecords: Array(5).fill({ status: 'ABSENT', lateMinutes: 0, overtimeMinutes: 0 }),
      performanceReviews: [{ overallScore: 1 }],
    });
    mockPrisma.employee.findMany.mockResolvedValue([low, high]);
    const results = await service.predictBatch('t1');
    expect(results[0].employeeName).toBe('High Risk');
    expect(results[1].employeeName).toBe('Low Risk');
  });

  it('predictSingle returns null for non-existent employee', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    const result = await service.predictSingle('t1', 'non-existent');
    expect(result).toBeNull();
  });

  it('predictSingle returns prediction for existing employee', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(baseEmployee());
    const result = await service.predictSingle('t1', 'e1');
    expect(result).not.toBeNull();
    expect(result!.employeeName).toBe('Budi Santoso');
  });
});
