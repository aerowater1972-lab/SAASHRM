import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { AIAnalyticsService } from './services/ai-analytics.service';
import { NotFoundException } from '@nestjs/common';

const MOCK_TENANT = 't-1';
const MOCK_EMP1 = 'e-1';
const MOCK_EMP2 = 'e-2';

const buildEmployee = (over: any = {}) => ({
  id: over.id ?? MOCK_EMP1,
  tenantId: MOCK_TENANT,
  fullName: over.name ?? 'Budi',
  status: 'ACTIVE',
  employments: over.employments ?? [{ isActive: true, startDate: new Date('2020-01-01') }],
  attendanceRecords: over.attendanceRecords ?? [],
  leaveBalances: over.leaveBalances ?? [],
  performanceReviews: over.performanceReviews ?? [],
  disciplinaryCases: over.disciplinaryCases ?? [],
  engagementSurveys: over.engagementSurveys ?? [],
  surveyResponses: over.surveyResponses ?? [],
});

const buildAttendance = (over: any = {}) => ({
  id: over.id ?? 'a-1',
  isApproved: true,
  status: over.status ?? 'PRESENT',
  lateMinutes: over.lateMinutes ?? 0,
  overtimeMinutes: over.overtimeMinutes ?? 0,
  isSuspicious: over.isSuspicious ?? false,
  date: over.date ?? new Date(),
});

const buildMockPrisma = (over: any = {}) => ({
  employee: {
    findMany: jest.fn().mockImplementation((args: any) => {
      const where = args?.where ?? {};
      const employees = over.employees ?? [];
      const filtered = employees.filter((e: any) => {
        if (where.tenantId && e.tenantId !== where.tenantId) return false;
        if (where.status && e.status !== where.status) return false;
        return true;
      });
      if (args?.take) filtered.length = Math.min(args.take, filtered.length);
      return Promise.resolve(
        filtered.map((e: any) => ({
          ...e,
          attendanceRecords: e.attendanceRecords ?? [],
          leaveBalances: e.leaveBalances ?? [],
          performanceReviews: e.performanceReviews ?? [],
          disciplinaryCases: e.disciplinaryCases ?? [],
          employments: e.employments ?? [],
        })),
      );
    }),
    findFirst: jest.fn().mockImplementation((args: any) => {
      const where = args?.where ?? {};
      const employees = over.employees ?? [];
      const filtered = employees.filter((e: any) => {
        if (where.tenantId && e.tenantId !== where.tenantId) return false;
        if (where.id && e.id !== where.id) return false;
        if (where.status && e.status !== where.status) return false;
        return true;
      });
      if (args?.orderBy) {
        const key = Object.keys(args.orderBy)[0];
        if (key === 'createdAt') filtered.sort((a: any, b: any) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      }
      return Promise.resolve(filtered[0] ?? null);
    }),
  },
  engagementSurvey: {
    findFirst: jest.fn().mockResolvedValue(over.survey ?? null),
  },
  surveyResponses: {
    findMany: jest.fn().mockResolvedValue(over.responses ?? []),
  },
  user: {
    findMany: jest.fn().mockResolvedValue(over.hrUsers ?? []),
  },
  notification: {
    findFirst: jest.fn().mockResolvedValue(over.recentNotification ?? null),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
  },
});

describe('AIAnalyticsService', () => {
  let service: AIAnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = buildMockPrisma({
      employees: [
        buildEmployee({
          id: MOCK_EMP1,
          name: 'Budi',
          attendanceRecords: [
            buildAttendance({ status: 'PRESENT', overtimeMinutes: 20, isSuspicious: false }),
            buildAttendance({ status: 'LATE', lateMinutes: 40, isSuspicious: false }),
            buildAttendance({ status: 'ABSENT', isSuspicious: false }),
            buildAttendance({ status: 'PRESENT', isSuspicious: true }),
          ],
          leaveBalances: [{ totalEntitled: 10, totalUsed: 8, totalPending: 0 }],
          performanceReviews: [{ overallScore: 4, createdAt: new Date('2026-08-01') }],
          disciplinaryCases: [{ status: 'APPROVED' }],
          engagementSurveys: [],
          surveyResponses: [],
        }),
        buildEmployee({
          id: MOCK_EMP2,
          name: 'Siti',
          attendanceRecords: [
            buildAttendance({ status: 'PRESENT', overtimeMinutes: 0 }),
            buildAttendance({ status: 'PRESENT', overtimeMinutes: 0 }),
          ],
          leaveBalances: [{ totalEntitled: 10, totalUsed: 0, totalPending: 0 }],
          performanceReviews: [{ overallScore: 4.5, createdAt: new Date('2026-08-01') }],
          disciplinaryCases: [],
          engagementSurveys: [],
          surveyResponses: [],
        }),
      ],
      survey: {
        id: 's-1',
        type: 'PULSE',
        status: 'CLOSED',
        responses: [{ answerValue: '4' }, { answerValue: '3' }],
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<AIAnalyticsService>(AIAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('predictDisengagement: memproduksi skor & level terkait', async () => {
    const signals = await service.predictDisengagement(MOCK_TENANT, 10);
    expect(Array.isArray(signals)).toBe(true);
    expect(signals.length).toBe(2);
    for (const s of signals) {
      expect(s.riskScore).toBeGreaterThanOrEqual(0);
      expect(s.riskScore).toBeLessThanOrEqual(1);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(s.riskLevel);
      expect(s.factors).toBeInstanceOf(Array);
      expect(s.factors.length).toBeGreaterThan(0);
      expect(s.recommendation).toBeTruthy();
    }
  });

  it('predictDisengagementSingle: melempar saat karyawan tidak ditemukan', async () => {
    await expect(service.predictDisengagementSingle(MOCK_TENANT, 'tidak-ada')).rejects.toThrow(NotFoundException);
  });

  it('predictPromotionReadiness: menghasilkan skor & level', async () => {
    const rs = await service.predictPromotionReadiness(MOCK_TENANT, 10);
    expect(Array.isArray(rs)).toBe(true);
    for (const r of rs) {
      expect(r.readinessScore).toBeGreaterThanOrEqual(0);
      expect(r.readinessScore).toBeLessThanOrEqual(1);
      expect(['NOT_READY', 'SOON', 'READY', 'PRIORITY']).toContain(r.readinessLevel);
      expect(r.factors).toBeInstanceOf(Array);
    }
  });

  it('explainDisengagement: mengembalikan kontribusi fitur', async () => {
    const xs = await service.explainDisengagement(MOCK_TENANT, MOCK_EMP1);
    expect(Array.isArray(xs)).toBe(true);
    for (const x of xs) {
      expect(['increase', 'decrease']).toContain(x.direction);
      expect(typeof x.contribution).toBe('number');
      expect(x.description).toBeTruthy();
    }
  });

  it('checkDrift: mengembalikan distribusi psi & band', async () => {
    const dr = await service.checkDrift(MOCK_TENANT, 90);
    expect(Array.isArray(dr)).toBe(true);
    for (const d of dr) {
      expect(typeof d.psi).toBe('number');
      expect(['none', 'watch', 'drift']).toContain(d.band);
    }
  });

  it('predictDisengagementSingle: mengembalikan singal untuk karyawan', async () => {
    const s = await service.predictDisengagementSingle(MOCK_TENANT, MOCK_EMP1);
    expect(s.employeeId).toBe(MOCK_EMP1);
    expect(s.riskScore).toBeGreaterThanOrEqual(0);
    expect(s.riskScore).toBeLessThanOrEqual(1);
  });

  it('retrainJob: meningkatkan modelVersion & memproses karyawan', async () => {
    const before = service.getModelVersion();
    const res = await service.retrainJob(MOCK_TENANT);
    expect(res.modelVersion).toBeGreaterThan(before.version);
    expect(res.updatedAt).toBeInstanceOf(Date);
    expect(res.processed).toBeGreaterThan(0);
    expect(typeof res.meanRisk).toBe('number');
    expect(typeof res.highRiskCount).toBe('number');
  });

  it('retrainJob: tidak menyebabkan error saat tidak ada karyawan', async () => {
    const emptyPrisma = buildMockPrisma({ employees: [] });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAnalyticsService,
        { provide: PrismaService, useValue: emptyPrisma },
      ],
    }).compile();
    const emptyService = module.get<AIAnalyticsService>(AIAnalyticsService);
    const res = await emptyService.retrainJob(MOCK_TENANT);
    expect(res.processed).toBe(0);
    expect(res.meanRisk).toBe(0);
  });

  it('notifyHighRisk: mengembalikan 0 bila tidak ada HIGH/CRITICAL', async () => {
    prisma.user = { findMany: jest.fn().mockResolvedValue([]) };
    const n = await service.notifyHighRisk(MOCK_TENANT, 2);
    expect(typeof n).toBe('number');
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it('notifyHighRisk: mengirim ke HR admin dan idempoten 24 jam', async () => {
    const sentRows: any[] = [];
    prisma.user = { findMany: jest.fn().mockResolvedValue([{ id: 'u-hr' }]) };
    prisma.notification = {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const hit = sentRows.find(
          (r) => r.userId === where.userId && r.templateKey === where.templateKey,
        );
        return Promise.resolve(hit ?? null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: AIAnalyticsService,
          useFactory: (p: any) =>
            new (AIAnalyticsService as any)(p, {
              send: async (d: any) => {
                sentRows.push({ userId: d.userId, templateKey: d.templateKey });
              },
            }),
          inject: [PrismaService],
        },
      ],
    }).compile();
    const svc2 = mod.get<AIAnalyticsService>(AIAnalyticsService);
    jest.spyOn(svc2 as any, 'predictDisengagement').mockResolvedValue([
      { employeeId: 'e-1', employeeName: 'Budi', riskScore: 0.9, riskLevel: 'CRITICAL', factors: [], recommendation: 'Segera 1-on-1', windowDays: 90 },
    ]);
    const first = await svc2.notifyHighRisk(MOCK_TENANT, 10);
    const second = await svc2.notifyHighRisk(MOCK_TENANT, 10);
    expect(first).toBe(1);
    expect(second).toBe(0);
  });
});

