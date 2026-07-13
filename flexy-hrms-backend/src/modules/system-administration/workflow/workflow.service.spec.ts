import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Unit test untuk BR-02 (System Administration): perubahan definisi
 * workflow membuat VERSI BARU dan menonaktifkan versi lama — TIDAK
 * pernah update in-place. Selaras dengan Master Test Plan Bagian 3
 * (Functional Test) dan prinsip shift-left testing (QA terlibat sejak
 * Sprint 1, lihat Master Test Plan Bagian 10).
 */
describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: {
    workflowDefinition: {
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditService: { ingest: jest.Mock };

  const TENANT_ID = 'tenant-1';

  beforeEach(async () => {
    prisma = {
      workflowDefinition: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    auditService = { ingest: jest.fn().mockResolvedValue({ queued: true, jobId: '1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(WorkflowService);
  });

  it('membuat versi 1 saat belum ada definisi sebelumnya', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(null);
    prisma.workflowDefinition.updateMany.mockResolvedValue({ count: 0 });
    prisma.workflowDefinition.create.mockResolvedValue({
      id: 'wf-1',
      version: 1,
      steps: [],
    });

    const result = await service.createOrNewVersion(
      TENANT_ID,
      {
        processType: 'leave_approval',
        steps: [{ stepOrder: 1, approverRole: 'Line Manager' }],
      },
      'user-1',
    );

    expect(result.version).toBe(1);
    expect(prisma.workflowDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1, isActive: true }),
      }),
    );
    expect(auditService.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', module: 'system_administration' }),
    );
  });

  it('menonaktifkan versi lama dan membuat versi baru saat sudah ada definisi aktif (BR-02)', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue({ id: 'wf-old', version: 1 });
    prisma.workflowDefinition.updateMany.mockResolvedValue({ count: 1 });
    prisma.workflowDefinition.create.mockResolvedValue({
      id: 'wf-new',
      version: 2,
      steps: [],
    });

    const result = await service.createOrNewVersion(
      TENANT_ID,
      {
        processType: 'leave_approval',
        steps: [
          { stepOrder: 1, approverRole: 'Line Manager' },
          { stepOrder: 2, approverRole: 'HR Manager' },
        ],
      },
      'user-1',
    );

    // Versi baru harus increment dari versi lama, BUKAN menimpa (in-place update).
    expect(result.version).toBe(2);

    // Versi lama harus dinonaktifkan (isActive: false), BUKAN dihapus —
    // agar pengajuan yang sedang berjalan tetap mengacu ke versi lamanya.
    expect(prisma.workflowDefinition.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
        data: { isActive: false },
      }),
    );
  });
});
