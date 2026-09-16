import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { CreateThrRunDto } from '../dto/thr.dto';

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
    // Terbitkan earning agar masuk payroll periode hari raya saja
    // (expiresAt = holidayDate membatasi jendela konsumsi).
    for (const rec of records) {
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
    await (this.prisma as any).thrRecord.updateMany({
      where: { runId: id },
      data: { status: 'paid', paidAt: new Date() },
    });
    return this.prisma.thrRun.update({ where: { id }, data: { status: 'PAID' } as any });
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
    let months = (holiday.getFullYear() - startDate.getFullYear()) * 12 + (holiday.getMonth() - startDate.getMonth());
    if (holiday.getDate() < startDate.getDate()) months -= 1;
    return Math.max(0, Math.min(12, months));
  }

  /** Upah THR = gaji pokok (grade) + komponen FIXED earning aktif. */
  private async wageBase(tenantId: string, employee: any): Promise<number> {
    const baseSalary = Number(employee?.employments?.[0]?.grade?.level || 0) * 1000000 || 0;
    const fixed = await this.prisma.payrollComponent.findMany({
      where: {
        tenantId,
        isActive: true,
        calculationMethod: 'FIXED',
        type: { in: ['EARNING', 'ALLOWANCE'] as any },
      } as any,
    });
    const allowances = (fixed as any[]).reduce((s, c) => s + Number(c.defaultValue ?? c.value ?? 0), 0);
    return baseSalary + allowances;
  }
}
