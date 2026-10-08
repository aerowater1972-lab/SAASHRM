import { Test, TestingModule } from '@nestjs/testing';
import { InterviewScorecardController } from './interview-scorecard.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('InterviewScorecardController', () => {
  let controller: InterviewScorecardController;
  const mockPrisma: any = {
    interviewScorecard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewScorecardController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(InterviewScorecardController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create persists a scorecard', async () => {
    const dto = { interviewId: 'i1', competency: 'Technical', score: 4 };
    mockPrisma.interviewScorecard.create.mockResolvedValue('created');
    const result = await controller.create(dto);
    expect(mockPrisma.interviewScorecard.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toBe('created');
  });

  it('findAll filters by interviewId when provided', async () => {
    mockPrisma.interviewScorecard.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('i1');
    expect(mockPrisma.interviewScorecard.findMany).toHaveBeenCalledWith({
      where: { interviewId: 'i1' },
      include: { interview: true },
      orderBy: { score: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns scorecard by id', async () => {
    mockPrisma.interviewScorecard.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('id-1');
    expect(mockPrisma.interviewScorecard.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      include: { interview: true },
    });
    expect(result).toBe('one');
  });
});
