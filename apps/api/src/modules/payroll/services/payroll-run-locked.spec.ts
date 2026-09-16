import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RunService } from './run.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { WORKFLOW_DEFINITIONS } from '@modules/shared/workflow/workflow.definitions';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

/**
 * RunService — BR-01: payroll run TIDAK PERNAH berubah setelah LOCKED,
 * dan siklus status HARUS berurutan
 * (DRAFT -> PROCESSING -> COMPLETED -> APPROVED -> LOCKED).
 * Memakai WorkflowEngineService ASLI + definisi asli agar terminal-nya
 * LOCKED (tanpa transisi keluar) benar-benar ditegakkan.
 */
describe('RunService - BR-01 locked & ordered lifecycle', () => {
  let service: RunService;
  let prisma: any;

  const baseRun = (status: string) => ({
    id: 'run-1',
    tenantId: 't1',
    status,
    period: { id: 'period-1', name: '2026-08' },
    payslips: [],
  });

  beforeEach(async () => {
    prisma = {
      payrollRun: { findFirst: jest.fn(), update: jest.fn() },
    };

    const engine = new WorkflowEngineService();
    engine.registerMany(WORKFLOW_DEFINITIONS);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunService,
        { provide: PrismaService, useValue: prisma },
        { provide: BpjsService, useValue: {} },
        { provide: TaxService, useValue: {} },
        { provide: EmployeeService, useValue: {} },
        { provide: WorkflowEngineService, useValue: engine },
        { provide: EventBusService, useValue: { publishTyped: jest.fn() } },
        { provide: PayrollAdjustmentService, useValue: {} },
      ],
    }).compile();

    service = module.get<RunService>(RunService);
  });

  afterEach(() => jest.clearAllMocks());

  it('BR-01: menolak process() pada run LOCKED (Forbidden, tanpa update)', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('LOCKED'));

    await expect(service.process('t1', 'run-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.payrollRun.update).not.toHaveBeenCalled();
  });

  it('BR-01: menolak approve() pada run LOCKED (tanpa update)', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('LOCKED'));

    await expect(service.approve('t1', 'run-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payrollRun.update).not.toHaveBeenCalled();
  });

  it('BR-01: menolak publish()/lock pada run LOCKED (tanpa update)', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('LOCKED'));

    await expect(service.publish('t1', 'run-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payrollRun.update).not.toHaveBeenCalled();
  });

  it('menolak lompat tahap: approve() langsung dari DRAFT', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('DRAFT'));

    await expect(service.approve('t1', 'run-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payrollRun.update).not.toHaveBeenCalled();
  });

  it('mengizinkan urutan benar: approve() dari COMPLETED -> APPROVED', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('COMPLETED'));
    prisma.payrollRun.update.mockResolvedValue(baseRun('APPROVED'));

    const result: any = await service.approve('t1', 'run-1', 'approver-1');

    expect(result.status).toBe('APPROVED');
    expect(prisma.payrollRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
  });

  it('mengizinkan urutan benar: publish()/lock dari APPROVED -> LOCKED', async () => {
    prisma.payrollRun.findFirst.mockResolvedValue(baseRun('APPROVED'));
    prisma.payrollRun.update.mockResolvedValue(baseRun('LOCKED'));

    const result: any = await service.publish('t1', 'run-1', 'admin-1');

    expect(result.status).toBe('LOCKED');
  });
});
