import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { PayrollPeriodStatus, TimesheetStatus, Prisma } from '@prisma/client';

export interface TimesheetCell {
  entryId: string | null;
  hours: number;
  description: string | null;
  billable: boolean;
  status: TimesheetStatus | null;
}

export interface TimesheetRow {
  taskId: string | null;
  projectId: string | null;
  taskTitle: string;
  projectName: string | null;
  cells: Record<string, TimesheetCell>; // key = YYYY-MM-DD
  total: number;
}

export interface WeeklyTimesheet {
  weekStart: string;
  weekEnd: string;
  days: string[];
  rows: TimesheetRow[];
  dayTotals: Record<string, number>;
  grandTotal: number;
  locked: boolean;
}

const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
const startOfUtcDay = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Rentang minggu (Senin-Minggu) yang mengandung `anchor`. */
  private weekRange(anchor: Date): { start: Date; end: Date; days: string[] } {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    const dow = (d.getUTCDay() + 6) % 7; // Monday=0
    const start = new Date(d.getTime() - dow * 86400000);
    const days: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      days.push(toDateOnly(new Date(start.getTime() + i * 86400000)));
    }
    const end = new Date(start.getTime() + 6 * 86400000);
    return { start, end, days };
  }

  private async isRangeLocked(tenantId: string, start: Date, end: Date): Promise<boolean> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        status: { in: [PayrollPeriodStatus.CLOSED, PayrollPeriodStatus.LOCKED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });
    return !!period;
  }

  private async assertNotLocked(tenantId: string, date: Date) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        status: { in: [PayrollPeriodStatus.CLOSED, PayrollPeriodStatus.LOCKED] },
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true },
    });
    if (period) {
      throw new ForbiddenException('Timesheet pada periode payroll yang sudah ditutup/dikunci tidak dapat diubah');
    }
  }

  /** Grid timesheet mingguan untuk satu karyawan. */
  async getWeekly(tenantId: string, employeeId: string, anchor?: string): Promise<WeeklyTimesheet> {
    const ref = anchor ? startOfUtcDay(anchor) : new Date();
    const { start, end, days } = this.weekRange(ref);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        tenantId,
        employeeId,
        workDate: { gte: start, lte: new Date(end.getTime() + 86400000 - 1) },
      },
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { workDate: 'asc' },
    });

    const rowMap = new Map<string, TimesheetRow>();
    const dayTotals: Record<string, number> = {};
    for (const d of days) dayTotals[d] = 0;
    let grandTotal = 0;

    for (const e of entries) {
      const key = e.taskId ? `task:${e.taskId}` : `proj:${e.projectId ?? 'none'}`;
      const dayKey = toDateOnly(new Date(e.workDate));
      const hours = Number(e.hours);
      let row = rowMap.get(key);
      if (!row) {
        row = {
          taskId: e.taskId,
          projectId: e.projectId ?? e.task?.projectId ?? null,
          taskTitle: e.task?.title ?? (e.project?.name ?? 'Lain-lain'),
          projectName: e.project?.name ?? e.task?.project?.name ?? null,
          cells: {},
          total: 0,
        };
        rowMap.set(key, row);
      }
      row.cells[dayKey] = { entryId: e.id, hours, description: e.description, billable: e.billable, status: e.status };
      row.total = Math.round((row.total + hours) * 100) / 100;
      dayTotals[dayKey] = Math.round((dayTotals[dayKey] + hours) * 100) / 100;
      grandTotal = Math.round((grandTotal + hours) * 100) / 100;
    }

    return {
      weekStart: toDateOnly(start),
      weekEnd: toDateOnly(end),
      days,
      rows: [...rowMap.values()].sort((a, b) => b.total - a.total),
      dayTotals,
      grandTotal,
      locked: await this.isRangeLocked(tenantId, start, end),
    };
  }


  /** Tambah / perbarui jam untuk satu (karyawan, tugas, hari). Idempoten (upsert). */
  async upsertEntry(
    tenantId: string,
    employeeId: string,
    dto: { taskId?: string; projectId?: string; workDate: string; hours: number; description?: string; billable?: boolean },
    actorId?: string,
  ) {
    const workDate = startOfUtcDay(dto.workDate);
    if (!Number.isFinite(dto.hours) || dto.hours <= 0 || dto.hours > 24) {
      throw new BadRequestException('Jam harus antara 0 dan 24');
    }
    if (!dto.taskId && !dto.projectId) {
      throw new BadRequestException('taskId atau projectId wajib diisi');
    }
    await this.assertNotLocked(tenantId, workDate);

    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({ where: { id: dto.taskId, tenantId, deletedAt: null }, select: { id: true, projectId: true } });
      if (!task) throw new NotFoundException('Tugas tidak ditemukan');
    }
    if (dto.projectId) {
      const proj = await this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId, deletedAt: null }, select: { id: true } });
      if (!proj) throw new NotFoundException('Proyek tidak ditemukan');
    }

    // Cari entri existing: Prisma tidak bisa lookup NULL pada unique compound,
    // jadi cari manual lalu create/update.
    const where = dto.taskId
      ? { employeeId_taskId_workDate: { employeeId, taskId: dto.taskId, workDate } }
      : { employeeId_taskId_workDate: { employeeId, taskId: null as any, workDate } };
    const existing = await this.prisma.timesheetEntry.findUnique({ where });
    const payload = {
      hours: new Prisma.Decimal(dto.hours),
      description: dto.description ?? null,
      billable: dto.billable ?? true,
      status: TimesheetStatus.DRAFT, // edit → perlu submit ulang
    };
    const entry = existing
      ? await this.prisma.timesheetEntry.update({ where: { id: existing.id }, data: payload })
      : await this.prisma.timesheetEntry.create({
          data: {
            tenantId,
            employeeId,
            workDate,
            taskId: dto.taskId ?? null,
            projectId: dto.projectId ?? null,
            ...payload,
            status: TimesheetStatus.DRAFT,
          },
        });

    await this.audit.ingest({
      tenantId,
      module: 'attendance',
      entity: 'timesheet_entry',
      entityId: entry.id,
      action: 'UPSERT',
      changedBy: actorId ?? employeeId,
      newValue: { workDate: dto.workDate, hours: dto.hours, taskId: dto.taskId, projectId: dto.projectId },
    });
    return entry;
  }

  async deleteEntry(tenantId: string, employeeId: string, entryId: string, actorId?: string) {
    const entry = await this.prisma.timesheetEntry.findFirst({ where: { id: entryId, tenantId, employeeId } });
    if (!entry) throw new NotFoundException('Entri timesheet tidak ditemukan');
    await this.assertNotLocked(tenantId, new Date(entry.workDate));
    await this.prisma.timesheetEntry.delete({ where: { id: entryId } });
    await this.audit.ingest({ tenantId, module: 'attendance', entity: 'timesheet_entry', entityId: entryId, action: 'DELETE', changedBy: actorId ?? employeeId });
    return { deleted: true };
  }

  async submitWeek(tenantId: string, employeeId: string, anchor: string, actorId?: string) {
    const { start, end } = this.weekRange(startOfUtcDay(anchor));
    await this.assertNotLocked(tenantId, start);
    const result = await this.prisma.timesheetEntry.updateMany({
      where: {
        tenantId,
        employeeId,
        status: TimesheetStatus.DRAFT,
        workDate: { gte: start, lte: new Date(end.getTime() + 86400000 - 1) },
      },
      data: { status: TimesheetStatus.SUBMITTED },
    });
    return { submitted: result.count };
  }

  async reviewEntry(tenantId: string, entryId: string, approve: boolean, approverId: string) {
    const entry = await this.prisma.timesheetEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException('Entri timesheet tidak ditemukan');
    const updated = await this.prisma.timesheetEntry.update({
      where: { id: entryId },
      data: { status: approve ? TimesheetStatus.APPROVED : TimesheetStatus.REJECTED, approvedBy: approverId, approvedAt: new Date() },
    });
    await this.audit.ingest({ tenantId, module: 'attendance', entity: 'timesheet_entry', entityId: entryId, action: approve ? 'APPROVE' : 'REJECT', changedBy: approverId });
    return updated;
  }

  /** Ringkasan jam APPROVED per karyawan — dasar komponen payroll "jam tugas/projek". */
  async approvedHoursSummary(tenantId: string, start: Date, end: Date) {
    const rows = await this.prisma.timesheetEntry.groupBy({
      by: ['employeeId'],
      where: { tenantId, status: TimesheetStatus.APPROVED, workDate: { gte: start, lte: end } },
      _sum: { hours: true },
    });
    return rows.map((r) => ({ employeeId: r.employeeId, approvedHours: Number(r._sum.hours ?? 0) }));
  }
}

