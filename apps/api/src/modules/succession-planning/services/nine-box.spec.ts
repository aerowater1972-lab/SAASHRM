import { Test, TestingModule } from '@nestjs/testing';
import { SuccessionPlanningService } from './succession-planning.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('SuccessionPlanningService - nineBoxMatrix', () => {
  let service: SuccessionPlanningService;

  const mockPrisma = {
    talentPoolMember: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuccessionPlanningService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SuccessionPlanningService>(SuccessionPlanningService);
  });

  afterEach(() => jest.clearAllMocks());

  it('memetakan anggota ke 9 kotak + rekomendasi aksi', async () => {
    mockPrisma.talentPoolMember.findMany.mockResolvedValue([
      { id: 'm-1', employeeId: 'e-1', performanceBand: 'HIGH', potentialBand: 'HIGH', readiness: 'READY_NOW', employee: { fullName: 'A' } },
      { id: 'm-2', employeeId: 'e-2', performanceBand: 'LOW', potentialBand: 'LOW', readiness: 'NOT_READY', employee: { fullName: 'B' } },
      { id: 'm-3', employeeId: 'e-3', performanceBand: null, potentialBand: 'MID', readiness: 'NOT_READY', employee: { fullName: 'C' } },
    ]);

    const res: any = await service.nineBoxMatrix('t1');

    expect(res.totalMembers).toBe(3);
    expect(res.boxes).toHaveLength(9);
    expect(res.boxes.find((b: any) => b.performance === 'HIGH' && b.potential === 'HIGH').count).toBe(1);
    expect(res.boxes.find((b: any) => b.performance === 'LOW' && b.potential === 'LOW').action).toMatch(/PHK prosedural/);
    expect(res.unplaced).toHaveLength(1);
  });
});
