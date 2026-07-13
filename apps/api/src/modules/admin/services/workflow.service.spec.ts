import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('WorkflowService (BR-02 / FR-08)', () => {
  let service: WorkflowService;
  const mockPrisma: any = {
    workflowDefinition: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    workflowInstance: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(WorkflowService);
    jest.clearAllMocks();
  });

  const steps = () => [
    { stepOrder: 1, name: 'Manager', approverType: 'ROLE', escalationStep: 2 },
    { stepOrder: 2, name: 'HR', approverType: 'ROLE', escalationStep: null },
  ];

  it('creates a workflow as ACTIVE v1 and detects circular escalation (FR-08)', async () => {
    mockPrisma.workflowDefinition.findUnique.mockResolvedValue(null);
    mockPrisma.workflowDefinition.create.mockResolvedValue({ id: 'w-1', version: 1 });

    await expect(
      service.create('default', {
        code: 'leave',
        name: 'Leave',
        steps: [
          { stepOrder: 1, approverType: 'ROLE', escalationStep: 2 },
          { stepOrder: 2, approverType: 'ROLE', escalationStep: 1 },
        ],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.workflowDefinition.create).not.toHaveBeenCalled();
  });

  it('creates a valid workflow', async () => {
    mockPrisma.workflowDefinition.findUnique.mockResolvedValue(null);
    mockPrisma.workflowDefinition.create.mockResolvedValue({ id: 'w-1', version: 1 });
    await service.create('default', { code: 'leave', name: 'Leave', steps: steps() } as any);
    expect(mockPrisma.workflowDefinition.create).toHaveBeenCalled();
  });

  it('editing steps creates a NEW version and archives the old (BR-02)', async () => {
    mockPrisma.workflowDefinition.findFirst.mockResolvedValue({
      id: 'w-1',
      code: 'leave',
      name: 'Leave',
      description: 'd',
      version: 1,
      status: 'ACTIVE',
    });
    mockPrisma.workflowDefinition.aggregate.mockResolvedValue({ _max: { version: 1 } });
    mockPrisma.workflowDefinition.updateMany.mockResolvedValue({});
    mockPrisma.workflowDefinition.create.mockResolvedValue({ id: 'w-2', version: 2 });

    await service.update('default', 'w-1', { steps: steps() } as any);

    // old active version archived
    expect(mockPrisma.workflowDefinition.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'default', code: 'leave', status: 'ACTIVE' }, data: { status: 'ARCHIVED' } }),
    );
    // new version created
    const created = mockPrisma.workflowDefinition.create.mock.calls[0][0].data;
    expect(created.version).toBe(2);
    expect(created.status).toBe('ACTIVE');
  });

  it('metadata-only update does not bump version (BR-02)', async () => {
    mockPrisma.workflowDefinition.findFirst.mockResolvedValue({ id: 'w-1', code: 'leave', version: 1 });
    mockPrisma.workflowDefinition.update.mockResolvedValue({ id: 'w-1' });

    await service.update('default', 'w-1', { name: 'Leave v2' } as any);

    expect(mockPrisma.workflowDefinition.update).toHaveBeenCalled();
    expect(mockPrisma.workflowDefinition.create).not.toHaveBeenCalled();
  });
});
