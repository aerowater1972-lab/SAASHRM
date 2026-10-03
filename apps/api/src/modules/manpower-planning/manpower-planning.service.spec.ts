import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManpowerPlanningService } from './manpower-planning.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';

describe('ManpowerPlanningService', () => {
  let service: ManpowerPlanningService;

  const mockPrisma = {
    tenant: { findUnique: jest.fn(), update: jest.fn() },
    grade: { findUnique: jest.fn() },
    manpowerPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    manpowerPlanItem: { findFirst: jest.fn() },
    jobRequisition: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    department: { findMany: jest.fn() },
  };
  const mockAudit = { ingest: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManpowerPlanningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
      ],
    }).compile();

    service = module.get<ManpowerPlanningService>(ManpowerPlanningService);
  });

  afterEach(() => jest.clearAllMocks());

  const semesterlyTenant = { settings: { manpowerPlanningPeriod: 'SEMESTERLY' } };

  it('create: membuat plan DRAFT + audit ingest (success path)', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(semesterlyTenant);
    mockPrisma.grade.findUnique.mockResolvedValue({ id: 'g-1', minSalary: 5000000, maxSalary: 7000000 });
    const plan = { id: 'plan-1', tenantId: 't1', status: 'DRAFT' };
    mockPrisma.manpowerPlan.create.mockResolvedValue(plan);

    const result = await service.create(
      't1',
      {
        departmentId: 'dept-1',
        period: '2026-H1',
        items: [
          { positionTitle: 'Staff HR', gradeId: 'g-1', quantity: 2, type: 'FULL_TIME' },
        ],
      } as any,
      'actor-1',
    );

    expect(result).toEqual(plan);
    expect(mockPrisma.manpowerPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          departmentId: 'dept-1',
          period: '2026-H1',
          status: 'DRAFT',
        }),
      }),
    );
    // estimasi gaji = rata-rata min/max grade
    const itemsArg = mockPrisma.manpowerPlan.create.mock.calls[0][0].data.items.create;
    expect(itemsArg[0].estimatedCost).toBe(6000000);
    expect(mockAudit.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', action: 'CREATE', entityId: 'plan-1' }),
    );
  });

  it('create: menolak format periode yang tidak sesuai konfigurasi tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(semesterlyTenant);

    await expect(
      service.create('t1', { departmentId: 'dept-1', period: '2026', items: [] } as any, 'actor-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.manpowerPlan.create).not.toHaveBeenCalled();
  });

  it('tenant-scoping: findAll/findOne where mengandung tenantId', async () => {
    mockPrisma.manpowerPlan.findMany.mockResolvedValue([]);
    mockPrisma.manpowerPlan.count.mockResolvedValue(0);
    mockPrisma.manpowerPlan.findFirst.mockResolvedValue({ id: 'plan-1', items: [] });

    await service.findAll('t1', {} as any);
    expect(mockPrisma.manpowerPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1' }) }),
    );

    await service.findOne('t1', 'plan-1');
    expect(mockPrisma.manpowerPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'plan-1', tenantId: 't1' }),
      }),
    );
  });

  it('findOne: melempar NotFoundException bila plan tidak ada', async () => {
    mockPrisma.manpowerPlan.findFirst.mockResolvedValue(null);

    await expect(service.findOne('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update: menolak plan non-DRAFT + sukses bila DRAFT (version increment)', async () => {
    mockPrisma.manpowerPlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'SUBMITTED' });
    await expect(service.update('t1', 'plan-1', {}, 'actor-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    mockPrisma.manpowerPlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'DRAFT' });
    mockPrisma.manpowerPlan.update.mockResolvedValue({ id: 'plan-1', status: 'DRAFT' });

    const result = await service.update('t1', 'plan-1', { departmentId: 'dept-2' }, 'actor-1');
    expect(result).toEqual({ id: 'plan-1', status: 'DRAFT' });
    expect(mockPrisma.manpowerPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ departmentId: 'dept-2' }),
      }),
    );
  });

  it('delete: soft-delete via deletedAt', async () => {
    mockPrisma.manpowerPlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'DRAFT' });
    mockPrisma.manpowerPlan.update.mockResolvedValue({ id: 'plan-1' });

    await service.delete('t1', 'plan-1');

    expect(mockPrisma.manpowerPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'plan-1', tenantId: 't1' }),
      }),
    );
    expect(mockPrisma.manpowerPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});
