import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { CreateOvertimeDto } from '../dto/create-overtime.dto';
import {
  OvertimeDayType,
  PayrollPeriodStatus,  Prisma,
  RequestStatus,
} from '@prisma/client';

const RETROACTIVE_FEATURE = 'OVERTIME_RETROACTIVE';

@Injectable()
export class OvertimeService {
  private readonly overtimeMinMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
  ) {
    this.overtimeMinMinutes = this.config.get<number>('OVERTIME_MIN_MINUTES', 30);
  }

  private diffMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  }

  async createRequest(tenantId: string, employeeId: string, dto: CreateOvertimeDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const totalMinutes = dto.totalMinutes ?? this.diffMinutes(startTime, endTime);

    if (totalMinutes < this.overtimeMinMinutes) {
      throw new BadRequestException(`Overtime minimum is ${this.overtimeMinMinutes} minutes`);
    }

    // UU 13/2003 Art 78: batas lembur MAKSIMAL 3 jam/hari dan 14 jam/minggu.
    // Menghitung request PENDING + APPROVED (rejected/cancelled tidak makan kuota).
    const day = new Date(dto.date);
    day.setUTCHours(0, 0, 0, 0);
    await this.assertOvertimeCaps(tenantId, employeeId, day, totalMinutes);

    // FR-16 / Flow 3.1 step 2: validate no roster/shift clash on the same date.
    // An employee already scheduled via a roster entry cannot be double-booked
    // with an overtime plan for the same day.
    const clash = await this.prisma.rosterEntry.findFirst({
      where: { employeeId, date: day },
    });
    if (clash) {
      throw new BadRequestException('Karyawan sudah memiliki jadwal roster/shift pada tanggal tersebut');
    }

    const request = await this.prisma.overtimeRequest.create({
      data: {
        tenantId,
        employeeId,
        date: new Date(dto.date),
        startTime,
        endTime,
        totalMinutes,
        reason: dto.reason,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    await this.eventBus.publish({
      name: 'overtime.requested',
      aggregateId: request.id,
      aggregateType: 'OvertimeRequest',
      payload: {
        employeeId,
        date: request.date,
        totalMinutes: request.totalMinutes,
        reason: request.reason,
      },
      tenantId,
    });

    return request;
  }

  async findRecords(tenantId: string, filters: { employeeId?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.OvertimeRecordWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    return this.prisma.overtimeRecord.findMany({
      where,
      include: {
        overtimeRequest: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllRequests(tenantId: string, filters: { employeeId?: string; status?: RequestStatus; startDate?: string; endDate?: string }) {
    const where: Prisma.OvertimeRequestWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    return this.prisma.overtimeRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRequest(tenantId: string, id: string) {
    const request = await this.prisma.overtimeRequest.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, employments: { include: { department: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    return request;
  }

  /**
   * Segregation of duties: approver (user id) tidak boleh menyetujui
   * pengajuan miliknya sendiri (dipetakan via user.employeeId).
   * Dilewati bila akun approver tak tertaut ke karyawan (mis. sysadmin).
   */
  private async assertNotSelfApproval(approverId: string, employeeId: string): Promise<void> {
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { employeeId: true },
    });
    if (approver?.employeeId && approver.employeeId === employeeId) {
      throw new ForbiddenException('Tidak dapat menyetujui pengajuan sendiri (segregation of duties)');
    }
  }

  async approveRequest(tenantId: string, id: string, approverId: string, notes?: string) {
    const request = await this.findOneRequest(tenantId, id);

    await this.assertNotSelfApproval(approverId, request.employeeId);

    const transition = this.workflow.transition('overtime', request.status, 'APPROVE');

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes,
      },
    });

    await this.eventBus.publish({
      name: 'overtime.approved',
      aggregateId: id,
      aggregateType: 'OvertimeRequest',
      payload: { employeeId: request.employeeId, date: request.date, totalMinutes: request.totalMinutes, approverId },
      tenantId,
    });

    return updated;
  }

  async rejectRequest(tenantId: string, id: string, approverId: string, reason: string) {
    const request = await this.findOneRequest(tenantId, id);

    const transition = this.workflow.transition('overtime', request.status, 'REJECT');

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    await this.eventBus.publish({
      name: 'overtime.rejected',
      aggregateId: id,
      aggregateType: 'OvertimeRequest',
      payload: { employeeId: request.employeeId, date: request.date, reason },
      tenantId,
    });

    return updated;
  }

  async cancelRequest(tenantId: string, id: string, employeeId: string) {
    const request = await this.findOneRequest(tenantId, id);

    if (request.employeeId !== employeeId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    this.workflow.transition('overtime', request.status, 'CANCEL');

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: { status: RequestStatus.CANCELLED },
    });
  }

  /**
   * FR-20 / BR-10: retroactive approval by HR for unplanned overtime.
   * Only available when the tenant enables the OVERTIME_RETROACTIVE feature flag.
   */
  async retroactiveApprove(tenantId: string, id: string, approverId: string, reason: string) {
    const enabled = await this.isRetroactiveEnabled(tenantId);
    if (!enabled) {
      throw new ForbiddenException('Retroactive overtime approval is disabled for this tenant');
    }

    const request = await this.findOneRequest(tenantId, id);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Cannot retroactively approve a ${request.status} overtime request`);
    }

    await this.assertNotSelfApproval(approverId, request.employeeId);

    const transition = this.workflow.transition('overtime', request.status, 'APPROVE');

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: reason,
      },
    });

    await this.eventBus.publish({
      name: 'overtime.approved',
      aggregateId: id,
      aggregateType: 'OvertimeRequest',
      payload: { employeeId: request.employeeId, date: request.date, totalMinutes: request.totalMinutes, approverId, retroactive: true },
      tenantId,
    });

    return updated;
  }

  private async isRetroactiveEnabled(tenantId: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature: RETROACTIVE_FEATURE },
    });
    return Boolean(flag?.enabled);
  }

  /**
   * FR-19: classify the overtime day type against the tenant holiday calendar.
   * hari_libur_resmi if the date is a recorded holiday, istirahat_mingguan if
   * Sunday, otherwise hari_kerja.
   */
  private async assertOvertimeCaps(
    tenantId: string,
    employeeId: string,
    day: Date,
    newMinutes: number,
  ): Promise<void> {
    const MAX_DAILY_MINUTES = 180; // 3 jam/hari
    const MAX_WEEKLY_MINUTES = 840; // 14 jam/minggu

    // Awal pekan (Senin) dari tanggal yang diajukan.
    const weekStart = new Date(day);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999); // akhir Minggu, bukan awal hari

    const existing = await this.prisma.overtimeRequest.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: weekStart, lte: weekEnd },
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      },
      select: { date: true, totalMinutes: true },
    });

    const sameDay = (d: Date) =>
      d.getUTCFullYear() === day.getUTCFullYear() &&
      d.getUTCMonth() === day.getUTCMonth() &&
      d.getUTCDate() === day.getUTCDate();

    const dayTotal = existing.filter((r) => sameDay(new Date(r.date))).reduce((s, r) => s + r.totalMinutes, 0);
    if (dayTotal + newMinutes > MAX_DAILY_MINUTES) {
      throw new BadRequestException(
        `Melebihi batas lembur harian (maks 3 jam/hari, UU 13/2003): sudah ada ${dayTotal} menit pada tanggal ini.`,
      );
    }

    const weekTotal = existing.reduce((s, r) => s + r.totalMinutes, 0);
    if (weekTotal + newMinutes > MAX_WEEKLY_MINUTES) {
      throw new BadRequestException(
        `Melebihi batas lembur mingguan (maks 14 jam/minggu, UU 13/2003): sudah ada ${weekTotal} menit pada pekan ini.`,
      );
    }
  }

  private async classifyDayType(tenantId: string, date: Date): Promise<OvertimeDayType> {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);

    const holiday = await this.prisma.holidayCalendar.findFirst({
      where: { tenantId, date: day },
    });

    if (holiday) return OvertimeDayType.HARI_LIBUR_RESM;
    if (day.getUTCDay() === 0) return OvertimeDayType.ISTIRAHAT_MINGGUAN;
    return OvertimeDayType.HARI_KERJA;
  }

  /**
   * FR-18 / BR-09: reconcile actual clock-out with approved plan and persist an
   * OvertimeRecord. payableMinutes = MIN(planned, actual). Unplanned overtime
   * (no approved request) is only recorded as paid when the tenant allows
   * retroactive mode; otherwise it is marked unpaid and excluded from payroll.
   */
  async reconcile(tenantId: string, employeeId: string, date: Date, actualMinutes: number) {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);

    const request = await this.prisma.overtimeRequest.findFirst({
      where: { tenantId, employeeId, date: day, status: RequestStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });

    const dayType = await this.classifyDayType(tenantId, date);

    if (!request) {
      const retroactive = await this.isRetroactiveEnabled(tenantId);
      return this.prisma.overtimeRecord.create({
        data: {
          tenantId,
          employeeId,
          date: day,
          plannedMinutes: 0,
          actualMinutes,
          payableMinutes: 0,
          dayType,
          isRetroactive: true,
          isPaid: retroactive,
        },
      });
    }

    const payableMinutes = Math.min(request.totalMinutes, actualMinutes);

    return this.prisma.overtimeRecord.create({
      data: {
        tenantId,
        employeeId,
        overtimeRequestId: request.id,
        date: day,
        plannedMinutes: request.totalMinutes,
        actualMinutes,
        payableMinutes,
        dayType,
        isRetroactive: false,
        isPaid: true,
      },
    });
  }

  async getSummary(tenantId: string, employeeId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const records = await this.prisma.overtimeRecord.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: start, lte: end },
        isPaid: true,
      },
      orderBy: { date: 'asc' },
    });

    const payableMinutes = records.reduce((sum, r) => sum + r.payableMinutes, 0);
    const totalHours = Math.floor(payableMinutes / 60);
    const remainingMinutes = payableMinutes % 60;

    return {
      employeeId,
      period: { startDate, endDate },
      payableMinutes,
      totalHours,
      remainingMinutes,
      totalRecords: records.length,
      records,
    };
  }
}
