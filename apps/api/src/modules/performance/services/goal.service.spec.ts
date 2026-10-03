import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GoalService } from './goal.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';

describe('GoalService (BR-02)', () => {
  let service: GoalService;
  let prisma: any;

  const mockPrisma: any = {
    goal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    performanceReview: {
      findFirst: jest.fn(),
    },
    reviewCycle: {
      findFirst: jest.fn(),
    },
  };
  const mockEmployeeService = { findById: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
      ],
    }).compile();

    service = module.get(GoalService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create (BR-02)', () => {
    it('sets approvalRequired=true when created after >50% of cycle elapsed', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1' });
      mockPrisma.performanceReview.findFirst.mockResolvedValue({ cycleId: 'c1' });

      const now = Date.now();
      const pastStart = new Date(now - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const cycleEnd = new Date(now + 10 * 24 * 60 * 60 * 1000);   // 10 days from now (total 110 days)
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({
        id: 'c1',
        startDate: pastStart,
        endDate: cycleEnd,
      });

      const dto: any = { title: 'Test Goal', reviewId: 'r1' };
      mockPrisma.goal.create.mockResolvedValue({ id: 'g1', approvalRequired: true, status: 'NOT_STARTED' });

      const result = await service.create('default', 'emp-1', dto);
      expect(result.approvalRequired).toBe(true);
      // create should include approvalRequired=true in the data
      expect(mockPrisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ approvalRequired: true }) }),
      );
    });

    it('sets approvalRequired=false when created early in cycle', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1' });
      mockPrisma.performanceReview.findFirst.mockResolvedValue({ cycleId: 'c1' });

      const now = Date.now();
      const pastStart = new Date(now - 10 * 24 * 60 * 60 * 1000);  // 10 days ago
      const futureEnd = new Date(now + 100 * 24 * 60 * 60 * 1000); // 100 days from now (total 110 days)
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({
        id: 'c1',
        startDate: pastStart,
        endDate: futureEnd,
      });

      const dto: any = { title: 'Early Goal', reviewId: 'r1' };
      mockPrisma.goal.create.mockResolvedValue({ id: 'g2', approvalRequired: false });

      const result = await service.create('default', 'emp-1', dto);
      expect(result.approvalRequired).toBe(false);
    });
  });

  describe('approve (BR-02)', () => {
    it('sets approvedById and transitions NOT_STARTED to IN_PROGRESS', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue({ id: 'g1', approvalRequired: true, status: 'NOT_STARTED' });
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1', approvedById: 'hrbp-1', status: 'IN_PROGRESS' });

      const result = await service.approve('default', 'g1', 'hrbp-1');
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { approvedById: 'hrbp-1', status: 'IN_PROGRESS' },
      });
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('returns goal as-is if approvalRequired is false', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue({ id: 'g2', approvalRequired: false });
      const result = await service.approve('default', 'g2', 'hrbp-1');
      expect(mockPrisma.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('PIP', () => {
    it('startPip membuat goal [PIP] IN_PROGRESS 90 hari + pipStatus agregat', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1' });
      mockPrisma.goal.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `g-${data.title}`, ...data }),
      );
      const res: any = await service.startPip('t1', 'emp-1', {
        goals: [{ title: 'Kehadiran >= 95%', targetValue: 95 }],
      });
      expect(res.goals).toHaveLength(1);
      expect(res.goals[0].title).toMatch(/^\[PIP\]/);
      expect(res.goals[0].status).toBe('IN_PROGRESS');

      mockPrisma.goal.findMany.mockResolvedValue([
        { id: 'g-1', title: '[PIP] A', status: 'ACHIEVED', endDate: new Date('2026-12-31') },
        { id: 'g-2', title: '[PIP] B', status: 'IN_PROGRESS', endDate: new Date('2026-12-31') },
      ]);
      const st: any = await service.pipStatus('t1', 'emp-1');
      expect(st.total).toBe(2);
      expect(st.achieved).toBe(1);
      expect(st.passed).toBe(false);
      expect(st.active).toBe(true);
    });

    it('pipStatus inactive bila belum pernah PIP', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      const st: any = await service.pipStatus('t1', 'emp-1');
      expect(st.active).toBe(false);
    });
  });
});
