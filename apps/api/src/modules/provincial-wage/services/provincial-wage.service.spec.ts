import { Test, TestingModule } from '@nestjs/testing';
import { ProvincialWageService } from './provincial-wage.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('ProvincialWageService.checkCompliance (PP 36/2021)', () => {
  let service: ProvincialWageService;

  const mockPrisma = {
    employee: { findMany: jest.fn() },
    payrollComponent: { findMany: jest.fn().mockResolvedValue([]) },
    provincialMinimumWage: { findFirst: jest.fn() },
  };

  const emp = (id: string, province: string | null, level: number | null) => ({
    id,
    employeeId: `CODE-${id}`,
    fullName: `Emp ${id}`,
    province,
    employments: level === null ? [] : [{ grade: { level } }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvincialWageService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProvincialWageService>(ProvincialWageService);
  });

  afterEach(() => jest.clearAllMocks());

  it('memisahkan compliant / below / unknown', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      emp('e1', 'DKI Jakarta', 8), // 8jt >= 5,4jt
      emp('e2', 'DKI Jakarta', 1), // 1jt < 5,4jt
      emp('e3', null, 8), // tanpa provinsi
      emp('e4', 'Bali', 8), // tanpa entri upah
    ]);
    mockPrisma.provincialMinimumWage.findFirst.mockImplementation(({ where }: any) => {
      if (where.province === 'DKI Jakarta') return Promise.resolve({ minimumWage: 5400000 });
      return Promise.resolve(null);
    });

    const r = await service.checkCompliance('t1', 2026);

    expect(r.checked).toBe(4);
    expect(r.compliant).toBe(1);
    expect(r.belowCount).toBe(1);
    expect(r.unknownCount).toBe(2);
    expect(r.below[0]).toEqual(
      expect.objectContaining({ employeeId: 'e2', wage: 1000000, minimumWage: 5400000, shortfall: 4400000 }),
    );
    expect(r.unknown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ employeeId: 'e3', reason: 'NO_PROVINCE' }),
        expect.objectContaining({ employeeId: 'e4', reason: 'NO_WAGE_ENTRY' }),
      ]),
    );
  });

  it('ambang batas: upah pas minimum dinilai compliant', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([emp('e1', 'DKI Jakarta', 5)]);
    mockPrisma.provincialMinimumWage.findFirst.mockResolvedValue({ minimumWage: 5000000 });

    const r = await service.checkCompliance('t1', 2026);

    expect(r.compliant).toBe(1);
    expect(r.belowCount).toBe(0);
  });
});
