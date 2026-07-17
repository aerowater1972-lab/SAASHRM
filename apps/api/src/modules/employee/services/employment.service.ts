import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { CreateEmploymentDto } from '../dto/create-employment.dto';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { EmployeeStatus, EmploymentType } from '@prisma/client';

// Addendum v1.2 (PKWT): batas akumulasi PKWT maksimal 5 tahun kalender (UU Cipta Kerja)
export const PKWT_MAX_YEARS = 5;

interface PkwtAccumulation {
  employeeId: string;
  totalMonths: number;
  totalDays: number;
  contractCount: number;
  // proyeksi jika employment baru ditambahkan
  projectedMonths: number;
  projectedDays: number;
  exceedsLimit: boolean;
  limitYears: number;
}

@Injectable()
export class EmploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notification: NotificationService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateEmploymentDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const position = await this.prisma.position.findFirst({
      where: { id: dto.positionId, tenantId },
    });
    if (!position) throw new NotFoundException('Position not found');

    if (dto.gradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.gradeId, tenantId },
      });
      if (!grade) throw new NotFoundException('Grade not found');
    }

    // Addendum v1.2 (PKWT): FR-14/FR-16 + BR-09/BR-10 — validasi akumulasi sebelum simpan
    if (dto.type === EmploymentType.CONTRACT) {
      const accumulation = await this.computePkwtAccumulation(
        tenantId,
        employeeId,
        dto.startDate,
        dto.endDate,
      );

      if (accumulation.exceedsLimit) {
        const limitMonths = accumulation.limitYears * 12;
        throw new BadRequestException(
          `Akumulasi PKWT (${accumulation.projectedMonths} bulan / ${(accumulation.projectedDays / 30).toFixed(1)} bulan hari-kerja) ` +
            `melebihi batas maksimal ${limitMonths} bulan (${accumulation.limitYears} tahun) sesuai UU Cipta Kerja. ` +
            `Hubungan kerja harus diubah menjadi PKWTT (permanent) atau diakhiri melalui modul Resignation & Offboarding.`,
        );
      }
    }

    const activeEmployment = await this.prisma.employment.findFirst({
      where: { employeeId, isActive: true },
    });

    const oldGradeId = activeEmployment?.gradeId || null;
    if (activeEmployment) {
      await this.prisma.employment.update({
        where: { id: activeEmployment.id },
        data: { isActive: false, endDate: new Date() },
      });
    }

    if (employee.status === EmployeeStatus.PENDING_ACTIVATION) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { status: EmployeeStatus.ACTIVE },
      });
    }

    const created = await this.prisma.employment.create({
      data: {
        employeeId,
        positionId: dto.positionId,
        departmentId: dto.departmentId,
        gradeId: dto.gradeId,
        entityId: dto.entityId,
        type: dto.type as any,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        salary: dto.salary,
        salaryCurrency: dto.salaryCurrency ?? 'IDR',
        isActive: true,
      },
      include: { department: true, position: true, grade: true },
    });

    if (dto.gradeId && oldGradeId && dto.gradeId !== oldGradeId) {
      await this.eventBus.publishTyped(DomainEventType.EMPLOYEE_GRADE_CHANGED, {
        employeeId,
        oldGradeId,
        newGradeId: dto.gradeId,
        effectiveDate: dto.startDate,
        tenantId,
      }, { aggregateId: created.id, tenantId });
    }

    return created;
  }

  async activate(tenantId: string, id: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id },
      include: { employee: true },
    });
    if (!employment) throw new NotFoundException('Employment not found');
    if (employment.employee.tenantId !== tenantId) {
      throw new NotFoundException('Employment not found');
    }

    if (employment.employee.status !== EmployeeStatus.PENDING_ACTIVATION) {
      throw new BadRequestException(
        'Employee must be in PENDING_ACTIVATION status to activate',
      );
    }

    await this.prisma.employee.update({
      where: { id: employment.employeeId },
      data: { status: EmployeeStatus.ACTIVE },
    });

    return this.prisma.employment.update({
      where: { id },
      data: { isActive: true },
      include: { department: true, position: true, grade: true, employee: true },
    });
  }

  async deactivate(tenantId: string, id: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id },
      include: { employee: true },
    });
    if (!employment) throw new NotFoundException('Employment not found');
    if (employment.employee.tenantId !== tenantId) {
      throw new NotFoundException('Employment not found');
    }

    await this.prisma.employee.update({
      where: { id: employment.employeeId },
      data: { status: EmployeeStatus.INACTIVE },
    });

    return this.prisma.employment.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
      include: { department: true, position: true, grade: true, employee: true },
    });
  }

  /**
   * Addendum v1.2 (PKWT) — FR-14 + BR-10.
   * Menghitung akumulasi durasi SELURUH employment bertipe CONTRACT milik satu karyawan
   * pada tenant yang sama (termasuk yang sudah berakhir), lalu memproyeksikan penambahan
   * employment baru jika startDate/endDate diberikan.
   */
  async computePkwtAccumulation(
    tenantId: string,
    employeeId: string,
    newStartDate?: string,
    newEndDate?: string,
  ): Promise<PkwtAccumulation> {
    const contracts = await this.prisma.employment.findMany({
      where: { employeeId, type: EmploymentType.CONTRACT },
      select: { startDate: true, endDate: true },
    });

    let totalDays = 0;
    for (const c of contracts) {
      totalDays += this.employmentDurationDays(c.startDate, c.endDate);
    }

    let projectedDays = totalDays;
    if (newStartDate) {
      projectedDays += this.employmentDurationDays(
        new Date(newStartDate),
        newEndDate ? new Date(newEndDate) : undefined,
      );
    }

    const limitYears = await this.getPkwtLimitYears(tenantId);
    const limitDays = limitYears * 365;
    const projectedMonths = Math.round((projectedDays / 365) * 12);

    return {
      employeeId,
      totalMonths: Math.round((totalDays / 365) * 12),
      totalDays,
      contractCount: contracts.length,
      projectedMonths,
      projectedDays,
      exceedsLimit: projectedDays > limitDays,
      limitYears,
    };
  }

  /**
   * Addendum v1.2 (PKWT) — FR-15.
   * Memeriksa seluruh karyawan dengan employment CONTRACT aktif; mengirim reminder ke HR Admin
   * H-N hari (default 90, dapat dikonfigurasi via tenant.settings.pkwtReminderDays) sebelum
   * akumulasi mencapai batas 5 tahun.
   */
  async runPkwtReminderCheck(reminderDays: number = 90): Promise<number> {
    let sent = 0;
    const tenants = await this.prisma.tenant.findMany();

    for (const tenant of tenants) {
      const limitYears = await this.getPkwtLimitYears(tenant.id);
      const limitDays = limitYears * 365;

      const contractEmployees = await this.prisma.employment.findMany({
        where: { type: EmploymentType.CONTRACT, isActive: true, employee: { tenantId: tenant.id } },
        select: { employeeId: true },
        distinct: ['employeeId'],
      });

      for (const { employeeId } of contractEmployees) {
        const acc = await this.computePkwtAccumulation(tenant.id, employeeId);
        const remainingDays = limitDays - acc.totalDays;
        if (remainingDays > 0 && remainingDays <= reminderDays) {
          await this.sendPkwtReminder(tenant.id, employeeId, acc, remainingDays);
          sent++;
        }
      }
    }
    return sent;
  }

  private async sendPkwtReminder(
    tenantId: string,
    employeeId: string,
    acc: PkwtAccumulation,
    remainingDays: number,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { fullName: true, employeeId: true },
    });

    await this.notification.send({
      tenantId,
      employeeId,
      templateKey: 'pkwt.reminder',
      title: 'Peringatan Batas Akumulasi PKWT',
      body:
        `Karyawan ${employee?.fullName ?? employeeId} (${employee?.employeeId ?? ''}) telah mengakumulasi ` +
        `${acc.totalMonths} bulan PKWT. Sisa ${Math.ceil(remainingDays)} hari sebelum mencapai batas ${acc.limitYears} tahun ` +
        `(UU Cipta Kerja). Segera ubah menjadi PKWTT atauakhiri hubungan kerja.`,
    });
  }

  private async getPkwtLimitYears(tenantId: string): Promise<number> {
    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: tenantId },
        select: { settings: true },
      });
      const settings = (tenant?.settings as Record<string, any>) ?? {};
      const configured = Number(settings?.pkwtLimitYears);
      if (configured > 0) return configured;
    } catch {
      /* fallthrough to default */
    }
    return PKWT_MAX_YEARS;
  }

  private employmentDurationDays(start: Date, end?: Date | null): number {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end ? (end instanceof Date ? end : new Date(end)) : new Date();
    const diff = Math.max(0, endDate.getTime() - startDate.getTime());
    return Math.floor(diff / 86400000) + 1;
  }
}
