import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Hubungan industrial kolektif (UU 13/2003, UU 2/2004 PPHI):
 * - GrievanceCase: pengaduan pekerja REPORTED -> IN_REVIEW -> MEDIATION
 *   -> RESOLVED -> CLOSED (REJECTED dari tahap awal). Penangan wajib beda
 *   dari pelapor; laporan rahasia (isConfidential) hanya dibuka ke HR/handler.
 * - BipartiteSession: notulen LKS Bipartit (pertemuan pengusaha x pekerja)
 *   SCHEDULED -> HELD -> FOLLOW_UP -> CLOSED. CLOSED wajib semua follow-up done.
 */
export const GRIEVANCE_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ['IN_REVIEW', 'REJECTED'],
  IN_REVIEW: ['MEDIATION', 'RESOLVED', 'REJECTED'],
  MEDIATION: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
};

export const GRIEVANCE_CATEGORIES = ['UPAH', 'JADWAL', 'KEKERASAN', 'DISKRIMINASI', 'K3', 'LAINNYA'];

@Injectable()
export class CollectiveRelationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  // -----------------------------------------------------------------------
  // Grievance
  // -----------------------------------------------------------------------
  async reportGrievance(
    tenantId: string,
    reporterId: string,
    dto: { category: string; subject: string; description: string; isConfidential?: boolean },
  ) {
    const reporter = await this.prisma.employee.findFirst({ where: { id: reporterId, tenantId } });
    if (!reporter) throw new NotFoundException('Employee not found');
    if (!GRIEVANCE_CATEGORIES.includes(String(dto.category).toUpperCase())) {
      throw new BadRequestException(`Kategori tidak dikenal: ${dto.category} (${GRIEVANCE_CATEGORIES.join('|')})`);
    }
    if (!dto.subject?.trim() || !dto.description?.trim()) {
      throw new BadRequestException('Subject dan deskripsi pengaduan wajib diisi');
    }
    return this.db.grievanceCase.create({
      data: {
        tenantId,
        reporterId,
        category: String(dto.category).toUpperCase(),
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        isConfidential: dto.isConfidential ?? true,
        status: 'REPORTED',
      },
    });
  }

  async listGrievances(tenantId: string, viewer: { employeeId?: string | null; roles?: string[] }) {
    const cases = await this.db.grievanceCase.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const privileged =
      (viewer.roles ?? []).some((r) => ['HR Admin', 'System Administrator', 'Legal', 'Direksi'].includes(r));
    // Identitas pelapor laporan rahasia hanya untuk pihak berwenang/handler/pelapor.
    return (cases as any[]).map((c) => {
      const visible = !c.isConfidential || privileged || c.handlerId === viewer.employeeId || c.reporterId === viewer.employeeId;
      if (visible) return c;
      const { reporterId, description, ...rest } = c;
      return { ...rest, reporterId: 'CONFIDENTIAL', description: '[rahasia]' };
    });
  }

  async assignGrievanceHandler(tenantId: string, id: string, handlerUserId: string) {
    const c = await this.db.grievanceCase.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Grievance case not found');
    const handler = await this.prisma.user.findFirst({
      where: { id: handlerUserId, tenantId },
      include: { employee: { select: { id: true } } } as any,
    });
    if (!handler) throw new NotFoundException('Handler not found');
    if ((handler as any).employee?.id === c.reporterId) {
      throw new ForbiddenException('Penangan tidak boleh merangkap sebagai pelapor');
    }
    return this.db.grievanceCase.update({
      where: { id },
      data: { handlerId: handlerUserId, status: c.status === 'REPORTED' ? 'IN_REVIEW' : c.status },
    });
  }

  async advanceGrievance(
    tenantId: string,
    id: string,
    to: string,
    actorUserId: string,
    resolution?: string,
  ) {
    const c = await this.db.grievanceCase.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Grievance case not found');
    const target = String(to).toUpperCase();
    if (!(GRIEVANCE_TRANSITIONS[c.status] ?? []).includes(target)) {
      throw new BadRequestException(`Transisi ${c.status} -> ${target} tidak diizinkan`);
    }
    if ((target === 'RESOLVED' || target === 'CLOSED') && !String(resolution ?? c.resolution ?? '').trim()) {
      throw new BadRequestException('RESOLVED/CLOSED wajib mencantumkan hasil penyelesaian (resolution)');
    }
    return this.db.grievanceCase.update({
      where: { id },
      data: {
        status: target,
        resolution: resolution ?? c.resolution,
        resolvedAt: target === 'RESOLVED' || target === 'CLOSED' ? new Date() : c.resolvedAt,
      },
    });
  }

  // -----------------------------------------------------------------------
  // LKS Bipartit
  // -----------------------------------------------------------------------
  async scheduleBipartite(
    tenantId: string,
    dto: { sessionDate: string; topic: string; managementAttendees: string[]; workerAttendees: string[] },
  ) {
    const date = new Date(dto.sessionDate);
    if (Number.isNaN(+date)) throw new BadRequestException('sessionDate tidak valid');
    if (!dto.topic?.trim()) throw new BadRequestException('Topik pertemuan wajib diisi');
    // LKS Bipartit sah bila kedua unsur hadir (UU 13/2003 Pasal 106).
    if (!dto.managementAttendees?.length || !dto.workerAttendees?.length) {
      throw new BadRequestException('LKS Bipartit wajib dihadiri perwakilan pengusaha DAN pekerja/serikat');
    }
    return this.db.bipartiteSession.create({
      data: {
        tenantId,
        sessionDate: date,
        topic: dto.topic.trim(),
        managementAttendees: JSON.stringify(dto.managementAttendees),
        workerAttendees: JSON.stringify(dto.workerAttendees),
        status: 'SCHEDULED',
      },
    });
  }

  async holdBipartite(tenantId: string, id: string, minutes: string, followUps: Array<{ task: string; owner: string; dueDate: string }> = []) {
    const s = await this.db.bipartiteSession.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Bipartite session not found');
    if (s.status !== 'SCHEDULED') throw new BadRequestException(`Hanya SCHEDULED yang bisa dilaksanakan (status: ${s.status})`);
    if (!minutes?.trim()) throw new BadRequestException('Notulen (minutes) wajib diisi');
    return this.db.bipartiteSession.update({
      where: { id },
      data: {
        minutes: minutes.trim(),
        followUps: JSON.stringify(followUps.map((f) => ({ ...f, done: false }))),
        status: followUps.length > 0 ? 'FOLLOW_UP' : 'HELD',
      },
    });
  }

  async closeBipartite(tenantId: string, id: string, followUps?: Array<{ task: string; owner: string; dueDate: string; done: boolean }>) {
    const s = await this.db.bipartiteSession.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Bipartite session not found');
    if (s.status !== 'HELD' && s.status !== 'FOLLOW_UP') {
      throw new BadRequestException(`Hanya HELD/FOLLOW_UP yang bisa ditutup (status: ${s.status})`);
    }
    let current: any[] = [];
    try {
      current = followUps ?? JSON.parse(String(s.followUps || '[]'));
    } catch {
      current = [];
    }
    const pending = current.filter((f) => !f.done);
    if (pending.length > 0) {
      throw new BadRequestException(`Masih ada ${pending.length} tindak lanjut belum selesai: ${pending.map((f) => f.task).join('; ')}`);
    }
    return this.db.bipartiteSession.update({
      where: { id },
      data: { followUps: JSON.stringify(current), status: 'CLOSED' },
    });
  }

  async listBipartite(tenantId: string) {
    return this.db.bipartiteSession.findMany({
      where: { tenantId },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
