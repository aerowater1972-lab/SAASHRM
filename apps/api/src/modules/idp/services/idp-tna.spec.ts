import { Test, TestingModule } from '@nestjs/testing';
import { IDPService } from './idp.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('IDPService - trainingRecommendations (TNA)', () => {
  let service: IDPService;

  const mockPrisma = {
    individualDevelopmentPlan: { findMany: jest.fn() },
    goal: { findMany: jest.fn() },
    training: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IDPService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<IDPService>(IDPService);
  });

  afterEach(() => jest.clearAllMocks());

  it('mencocokkan katalog training dengan gap IDP + goal terbuka', async () => {
    mockPrisma.individualDevelopmentPlan.findMany.mockResolvedValue([
      { skillsGap: 'leadership communication', objectives: JSON.stringify(['Improve leadership']) },
    ]);
    mockPrisma.goal.findMany.mockResolvedValue([{ title: 'Target sales', metric: 'revenue' }]);
    mockPrisma.training.findMany.mockResolvedValue([
      { id: 't-1', title: 'Leadership Fundamentals', description: 'communication skills', category: 'MANAGEMENT' },
      { id: 't-2', title: 'Welding Basics', description: 'metal joinery', category: 'TECHNICAL' },
    ]);

    const res: any = await service.trainingRecommendations('t1', 'emp-1');

    expect(res.recommendations).toHaveLength(1);
    expect(res.recommendations[0].training.id).toBe('t-1');
    expect(res.recommendations[0].score).toBeGreaterThan(0);
  });

  it('kosong bila tidak ada kata kunci', async () => {
    mockPrisma.individualDevelopmentPlan.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    const res: any = await service.trainingRecommendations('t1', 'emp-1');
    expect(res.recommendations).toEqual([]);
  });
});
