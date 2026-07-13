import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * BR (System Administration, Bagian 6, BR-02): perubahan workflow TIDAK
   * berlaku surut. Setiap kali admin "mengubah" workflow, sistem
   * sebenarnya membuat VERSI BARU dan menonaktifkan versi lama — bukan
   * update in-place. Pengajuan yang sudah berjalan (menyimpan FK ke
   * workflow_definition_id versi lama) otomatis tetap mengikuti versi
   * tersebut sampai selesai, karena tidak pernah mengacu ke "versi
   * terbaru" secara dinamis.
   */
  async createOrNewVersion(tenantId: string, dto: CreateWorkflowDefinitionDto, actorUserId: string) {
    const latest = await this.prisma.workflowDefinition.findFirst({
      where: { tenantId, processType: dto.processType },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const [, created] = await this.prisma.$transaction([
      // Nonaktifkan versi lama (bila ada) — TIDAK dihapus, agar histori tetap tertelusuri.
      this.prisma.workflowDefinition.updateMany({
        where: { tenantId, processType: dto.processType, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.workflowDefinition.create({
        data: {
          tenantId,
          processType: dto.processType,
          version: nextVersion,
          isActive: true,
          steps: {
            create: dto.steps.map((s) => ({
              stepOrder: s.stepOrder,
              approverRole: s.approverRole,
              condition: s.condition,
              slaHours: s.slaHours ?? 24,
            })),
          },
        },
        include: { steps: true },
      }),
    ]);

    await this.auditService.ingest({
      tenantId,
      module: 'system_administration',
      entity: 'workflow_definition',
      entityId: created.id,
      action: 'create',
      changedBy: actorUserId,
      diff: { after: { processType: dto.processType, version: nextVersion } },
    });

    return created;
  }

  async getActiveDefinition(tenantId: string, processType: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { tenantId, processType, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }
}
