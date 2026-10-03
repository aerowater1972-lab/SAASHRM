import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { CreateThrRunDto } from '../dto/thr.dto';
import { calendarMonthsBetween, computeWageBase } from '@modules/shared/utils/wage-base.util';

/**
 * THR Keagamaan (Permenaker 6/2016):
 * - Syarat: masa kerja terus-menerus >= 1 bulan.
 * - >= 12 bulan (dalam 12 bln sebelum hari raya): 1 bulan upah.
 * - < 12 bulan: proporsional monthsWorked/12 x upah.
 * - Upah = gaji pokok (grade) + tunjangan TETAP aktif (FIXED).
 * - Wajib dibayar H-7 (dueDate); approve menerbitkan adjustment EARNING
 *   berbatas waktu agar otomatis masuk payroll periode berjalan saja.
 */
@Injectable()
export class ThrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly adjustments: PayrollAdjustmentService,
    @Optional() private readonly notification?: NotificationService,
  ) {}

  async createRun(tenantId: string, dto: CreateThrRunDto, userId?: string) {
    const holidayDate = new Date(dto.holidayDate);
    const dueDate = new Date(holidayDate);
    dueDate.setDate(dueDate.getDate() - 7);
    return this.prisma.thrRun.create({
      data: {
        tenantId,
        name: dto.name,
        holidayName: dto.holidayName,
        holidayDate,
        dueDate,
        createdBy: userId,
      } as any,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.thrRun.findMany({
      where: { tenantId },
      include: { _count: { select: { records: true } } },
      orderBy: { holidayDate: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const run = await this.prisma.thrRun.findFirst({
      where: { id, tenantId },
      include: { records: { include: { employee: { select: { id: true, employeeId: true, fullName: true } } } } },
    });
    if (!run) throw new NotFoundException(`THR run ${id} not found`);
    return run;
  }

  async calculateRun(tenantId: string, id: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status !== 'DRAFT') {
      throw new BadRequestException(`Hanya run DRAFT yang bisa dihitung (status: ${(run as any).status})`);
    }
    const employees = await this.employeeService.findActive(tenantId, {
      employments: { where: { isActive: true }, include: { grade: true } },
    } as any);
    const holiday = new Date((run as any).holidayDate);
    let created = 0;
    for (const emp of employees as any[]) {
      const months = this.monthsWorked(emp.startDate ? new Date(emp.startDate) : null, holiday);
      if (months < 1) continue; // belum 1 bulan -> tidak eligible
      const wageBase = await this.wageBase(tenantId, emp);
      const amount = months >= 12 ? wageBase : Math.round((wageBase * months) / 12);
      await (this.prisma as any).thrRecord.upsert({
        where: { runId_employeeId: { runId: id, employeeId: emp.id } },
        update: { monthsWorked: months, wageBase, amount, status: 'calculated' },
        create: { runId: id, employeeId: emp.id, monthsWorked: months, wageBase, amount },
      });
      created++;
    }
    return { runId: id, calculated: created };
  }

  async approveRun(tenantId: string, id: string, userId?: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status !== 'DRAFT') {
      throw new BadRequestException(`Hanya run DRAFT yang bisa disetujui (status: ${(run as any).status})`);
    }
    const records = await (this.prisma as any).thrRecord.findMany({ where: { runId: id } });
    // Idempoten: lewati karyawan yang adjustment THR-nya sudah terbit
    // (aman dari klik ganda / retry setelah status berubah).
    const existing = await (this.prisma as any).payrollAdjustment.findMany({
      where: { tenantId, sourceEvent: 'THR_ACCRUED', referenceId: id },
      select: { employeeId: true },
    });
    const published = new Set((existing as any[]).map((e) => e.employeeId));
    // Terbitkan earning agar masuk payroll periode hari raya saja
    // (expiresAt = holidayDate membatasi jendela konsumsi).
    for (const rec of records) {
      if (published.has(rec.employeeId)) continue;
      await this.adjustments.create({
        tenantId,
        employeeId: rec.employeeId,
        sourceEvent: 'THR_ACCRUED',
        referenceId: id,
        type: 'EARNING',
        amount: Number(rec.amount),
        description: `THR ${(run as any).holidayName} (${rec.monthsWorked} bln masa kerja)`,
        effectiveDate: new Date((run as any).holidayDate),
        expiresAt: new Date((run as any).holidayDate),
      });
    }
    await (this.prisma as any).thrRecord.updateMany({ where: { runId: id }, data: { status: 'approved' } });
    return this.prisma.thrRun.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() } as any,
    });
  }

  async markPaid(tenantId: string, id: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status !== 'APPROVED') {
      throw new BadRequestException(`Hanya run APPROVED yang bisa ditandai dibayar (status: ${(run as any).status})`);
    }
    const now = new Date();
    await (this.prisma as any).thrRecord.updateMany({
      where: { runId: id },
      data: { status: 'paid', paidAt: now },
    });
    const paid = await this.prisma.thrRun.update({ where: { id }, data: { status: 'PAID' } as any });

    // Denda keterlambatan (Permenaker 6/2016 Pasal 10): 5% x THR per hari
    // terlambat dari dueDate (H-7), dibayarkan ke karyawan sebagai earning.
    const dueDate = new Date((run as any).dueDate);
    const daysLate = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / 86400000));
    let lateFeeTotal = 0;
    if (daysLate > 0) {
      const records = await (this.prisma as any).thrRecord.findMany({ where: { runId: id } });
      const existingFees = await (this.prisma as any).payrollAdjustment.findMany({
        where: { tenantId, sourceEvent: 'THR_LATE_FEE', referenceId: id },
        select: { employeeId: true },
      });
      const feePublished = new Set((existingFees as any[]).map((e) => e.employeeId));
      for (const rec of records) {
        if (feePublished.has(rec.employeeId)) continue;
        const fee = Math.round(Number(rec.amount) * 0.05 * daysLate);
        if (fee <= 0) continue;
        lateFeeTotal += fee;
        await this.adjustments.create({
          tenantId,
          employeeId: rec.employeeId,
          sourceEvent: 'THR_LATE_FEE',
          referenceId: id,
          type: 'EARNING',
          amount: fee,
          description: `Denda keterlambatan THR ${daysLate} hari (5%/hari, Permenaker 6/2016)`,
          effectiveDate: now,
        });
      }
    }
    return { ...paid, daysLate, lateFeeTotal };
  }

  /**
   * Pengingat THR: run DRAFT/APPROVED (belum PAID) yang hari rayanya jatuh
   * dalam `daysAhead` hari ke depan. Mengingatkan HR agar hitung + bayar
   * sebelum dueDate H-7 (denda 5%/hari bila telat). Idempoten per hari:
   * dilewati bila notifikasi yang sama sudah dikirim < 24 jam terakhir.
   */
  async runThrReminderCheck(daysAhead: number = 14, now: Date = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + daysAhead * 86400000);
    const runs = await (this.prisma as any).thrRun.findMany({
      where: {
        status: { in: ['DRAFT', 'APPROVED'] },
        holidayDate: { gte: now, lte: horizon },
      },
    });
    let sent = 0;
    for (const run of runs as any[]) {
      const hrUsers = await this.prisma.user.findMany({
        where: {
          tenantId: run.tenantId,
          userRoles: { some: { role: { name: { in: ['HR Admin', 'System Administrator'] } } } },
        },
        select: { id: true },
      });
      for (const u of hrUsers) {
        const recent = await this.prisma.notification.findFirst({
          where: {
            userId: u.id,
            templateKey: 'thr.reminder',
            createdAt: { gte: new Date(now.getTime() - 86400000) },
          },
        }).catch(() => null);
        if (recent) continue;
        if (this.notification) {
          await this.notification.send({
            tenantId: run.tenantId,
            userId: u.id,
            templateKey: 'thr.reminder',
            title: 'THR mendekati hari raya',
            body:
              `THR ${run.holidayName} (${new Date(run.holidayDate).toISOString().slice(0, 10)}) ` +
              `status ${run.status}; dueDate H-7 ${new Date(run.dueDate).toISOString().slice(0, 10)}. ` +
              `Segera hitung, setujui, dan bayar (denda 5%/hari bila telat).`,
          });
        }
        sent++;
      }
    }
    return sent;
  }

  async cancelRun(tenantId: string, id: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status !== 'DRAFT') {
      throw new BadRequestException(`Hanya run DRAFT yang bisa dibatalkan (status: ${(run as any).status})`);
    }
    return this.prisma.thrRun.update({ where: { id }, data: { status: 'CANCELLED' } as any });
  }

  /** Bulan kalender penuh startDate -> holidayDate, dibatasi 0..12. */
  monthsWorked(startDate: Date | null, holiday: Date): number {
    if (!startDate || Number.isNaN(+startDate)) return 0;
    return Math.max(0, Math.min(12, calendarMonthsBetween(startDate, holiday)));
  }

  /** Upah THR = gaji pokok (grade) + tunjangan TETAP aktif (definisi bersama). */
  private async wageBase(tenantId: string, employee: any): Promise<number> {
    return computeWageBase(this.prisma, tenantId, employee);
  }
}
