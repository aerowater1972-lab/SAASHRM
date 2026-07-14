import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';

describe('ReviewService (BR-03)', () => {
  let service: ReviewService;
  let prisma: any;

  const mockPrisma: any = {
    performanceReview: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    rating: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    employment: { findMany: jest.fn() },
  };
  const mockEmployeeService = { findById: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
      ],
    }).compile();

    service = module.get(ReviewService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('findOne (BR-03 anonymization)', () => {
    function makeReview(overrides: Partial<any> = {}) {
      return {
        id: 'r1',
        employeeId: 'emp-1',
        reviewerId: 'peer-1',
        status: 'IN_PROGRESS' as const,
        cycleId: 'c1',
        tenantId: 'default',
        createdAt: new Date(),
        overallScore: null,
        summary: null,
        strengths: null,
        improvements: null,
        submittedAt: null,
        updatedAt: new Date(),
        ratings: [],
        cycle: { id: 'c1', name: 'H1', period: 'H1_2026', status: 'IN_PROGRESS' },
        employee: { id: 'emp-1', fullName: 'A', employeeId: 'EMP001' },
        goals: [],
        ...overrides,
      };
    }

    it('masks reviewerId for peer review when viewer is not the reviewer (BR-03)', async () => {
      mockPrisma.performanceReview.findFirst.mockResolvedValue(makeReview());
      const result = await service.findOne('default', 'r1', 'some-other-user');
      expect(result.reviewerId).toBeNull();
    });

    it('does NOT mask reviewerId when viewer is the reviewer themself', async () => {
      mockPrisma.performanceReview.findFirst.mockResolvedValue(makeReview());
      const result = await service.findOne('default', 'r1', 'peer-1');
      expect(result.reviewerId).toBe('peer-1');
    });

    it('does NOT mask reviewerId for self-review (employeeId === reviewerId)', async () => {
      mockPrisma.performanceReview.findFirst.mockResolvedValue(makeReview({ reviewerId: 'emp-1' }));
      const result = await service.findOne('default', 'r1', 'some-other-user');
      expect(result.reviewerId).toBe('emp-1');
    });
  });
});
