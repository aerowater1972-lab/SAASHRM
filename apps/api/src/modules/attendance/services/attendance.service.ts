import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { ClockInDto, ClockInMethod } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { AttendanceFilterDto } from '../dto/attendance-filter.dto';
import { AttendanceCorrectionDto } from '../dto/attendance-correction.dto';
import {
  AttendanceStatus,
  PayrollPeriodStatus,
  RequestStatus,
  Prisma,
  AttendanceRecord,
} from '@prisma/client';

@Injectable()
export class AttendanceService {
  private readonly geofenceRadius: number;
  private readonly overtimeMinMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.geofenceRadius = this.config.get<number>('GEOFENCE_RADIUS_METERS', 100);
    this.overtimeMinMinutes = this.config.get<number>('OVERTIME_MIN_MINUTES', 30);
  }

  async clockIn(tenantId: string, employeeId: string, dto: ClockInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.clockIn) {
      throw new BadRequestException('Already clocked in today');
    }

    await this.validateGeofence(tenantId, employeeId, dto.method, dto.latitude, dto.longitude);

    const shift = await this.findAssignedShift(tenantId, employeeId, today);

    const clockInTime = new Date();
    const lateMinutes = shift ? this.calculateLateMinutes(clockInTime, shift.startTime, shift.gracePeriodMinutes!) : 0;
    const status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const record = await this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        tenantId,
        employeeId,
        date: today,
        clockIn: clockInTime,
        clockInMethod: dto.method,
        clockInLat: dto.latitude,
        clockInLng: dto.longitude,
        clockInPhoto: dto.photo,
        shiftId: shift?.id,
        status,
        lateMinutes,
        notes: dto.notes,
      },
      update: {
        clockIn: clockInTime,
        clockInMethod: dto.method,
        clockInLat: dto.latitude,
        clockInLng: dto.longitude,
        clockInPhoto: dto.photo,
        shiftId: shift?.id,
        status,
        lateMinutes,
        notes: dto.notes,
      },
      include: { employee: true },
    });

    return record;
  }

  async clockOut(tenantId: string, employeeId: string, dto: ClockOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!record) {
      throw new BadRequestException('No clock-in record found for today');
    }

    if (record.clockOut) {
      throw new BadRequestException('Already clocked out today');
    }

    await this.validateGeofence(tenantId, employeeId, dto.method, dto.latitude, dto.longitude);

    const clockOutTime = new Date();
    const shift = record.shiftId
      ? await this.prisma.shift.findUnique({ where: { id: record.shiftId } })
      : null;

    const earlyLeaveMinutes = shift
      ? this.calculateEarlyLeaveMinutes(clockOutTime, shift.endTime)
      : 0;

    const overtimeMinutes = shift
      ? this.calculateOvertimeMinutes(record.clockIn || clockOutTime, clockOutTime, shift)
      : 0;

    let status = record.status;
    if (earlyLeaveMinutes > (shift?.earlyLeaveThresholdMinutes || 15)) {
      status = AttendanceStatus.EARLY_LEAVE;
    }

    const eligibleOvertime =
      overtimeMinutes >= this.overtimeMinMinutes ? overtimeMinutes : 0;

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: clockOutTime,
        clockOutMethod: dto.method,
        clockOutLat: dto.latitude,
        clockOutLng: dto.longitude,
        clockOutPhoto: dto.photo,
        status,
        earlyLeaveMinutes,
        overtimeMinutes: eligibleOvertime,
        notes: dto.notes ? `${record.notes || ''} ${dto.notes}`.trim() : record.notes,
      },
      include: { employee: true },
    });

    if (eligibleOvertime > 0) {
      await this.createAutoOvertime(tenantId, employeeId, today, record.clockIn || clockOutTime, clockOutTime, eligibleOvertime);
    }

    return updated;
  }

  private async createAutoOvertime(
    tenantId: string,
    employeeId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    totalMinutes: number,
  ) {
    const existing = await this.prisma.overtimeRequest.findFirst({
      where: { tenantId, employeeId, date },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.overtimeRequest.create({
      data: {
        tenantId,
        employeeId,
        date,
        startTime,
        endTime,
        totalMinutes,
        reason: 'Auto-generated from clock-out',
      },
    });
  }

  async findAll(tenantId: string, filters: AttendanceFilterDto): Promise<AttendanceRecord[] | Paginated<AttendanceRecord>> {
    const where: Prisma.AttendanceRecordWhereInput = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      where.OR = [
        { employee: { fullName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.attendanceRecord,
      {
        where,
        include: {
          employee: {
            select: { id: true, employeeId: true, fullName: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, employeeId: true, fullName: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  async correct(tenantId: string, id: string, employeeId: string, dto: AttendanceCorrectionDto) {
    const record = await this.findOne(tenantId, id);

    await this.assertPayrollPeriodOpen(tenantId, record.date);

    if (record.employeeId !== employeeId) {
      throw new ForbiddenException('You can only request corrections for your own records');
    }

    return this.prisma.attendanceCorrection.create({
      data: {
        attendanceId: record.id,
        requestedBy: employeeId,
        reason: dto.reason,
        proposedClockIn: dto.clockIn ? new Date(dto.clockIn) : null,
        proposedClockOut: dto.clockOut ? new Date(dto.clockOut) : null,
        status: RequestStatus.PENDING,
      },
    });
  }

  async approveCorrection(
    tenantId: string,
    correctionId: string,
    approverId: string,
    approve: boolean,
  ) {
    const correction = await this.prisma.attendanceCorrection.findUnique({
      where: { id: correctionId },
      include: { attendance: true },
    });

    if (!correction) {
      throw new NotFoundException('Attendance correction not found');
    }

    if (correction.attendance.tenantId !== tenantId) {
      throw new ForbiddenException('Correction does not belong to this tenant');
    }

    if (correction.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Correction is already ${correction.status}`);
    }

    if (!approve) {
      return this.prisma.attendanceCorrection.update({
        where: { id: correctionId },
        data: { status: RequestStatus.REJECTED, approvedBy: approverId },
      });
    }

    await this.assertPayrollPeriodOpen(tenantId, correction.attendance.date);

    await this.prisma.attendanceRecord.update({
      where: { id: correction.attendanceId },
      data: {
        clockIn: correction.proposedClockIn ?? undefined,
        clockOut: correction.proposedClockOut ?? undefined,
        isApproved: true,
        approvedBy: approverId,
      },
    });

    return this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: { status: RequestStatus.APPROVED, approvedBy: approverId },
    });
  }

  async closePeriod(tenantId: string, periodId: string, closedBy: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    if (period.status !== PayrollPeriodStatus.OPEN) {
      throw new BadRequestException(`Payroll period is already ${period.status}`);
    }

    const employees = await this.prisma.employee.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const summary: Array<{
      employeeId: string;
      presentDays: number;
      lateDays: number;
      leaveDays: number;
      absentDays: number;
      overtimeMinutes: number;
    }> = [];

    for (const emp of employees) {
      const records = await this.prisma.attendanceRecord.findMany({
        where: {
          tenantId,
          employeeId: emp.id,
          date: { gte: period.startDate, lte: period.endDate },
        },
      });

      const presentDays = records.filter((r) => r.clockIn).length;
      const lateDays = records.filter((r) => r.status === AttendanceStatus.LATE).length;
      const leaveDays = records.filter((r) => r.status === AttendanceStatus.LEAVE).length;
      const absentDays = records.filter(
        (r) => !r.clockIn && r.status !== AttendanceStatus.LEAVE,
      ).length;
      const overtimeMinutes = records.reduce(
        (sum, r) => sum + (r.overtimeMinutes || 0),
        0,
      );

      summary.push({
        employeeId: emp.id,
        presentDays,
        lateDays,
        leaveDays,
        absentDays,
        overtimeMinutes,
      });

      await this.eventBus.publish({
        name: 'attendance.period.closed',
        aggregateId: `${periodId}:${emp.id}`,
        aggregateType: 'attendance',
        payload: {
          employeeId: emp.id,
          period: periodId,
          workedDays: presentDays,
          lateCount: lateDays,
          overtimeMinutes,
          leaveDays,
          tenantId,
        },
        tenantId,
      });
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollPeriodStatus.CLOSED,
        closedBy,
        closedAt: new Date(),
      },
    });

    return { period: updated, summary };
  }

  async getToday(tenantId: string, employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    const shift = await this.findAssignedShift(tenantId, employeeId, today);

    return {
      record,
      shift,
      isClockedIn: !!record?.clockIn,
      isClockedOut: !!record?.clockOut,
      currentTime: new Date().toISOString(),
    };
  }

  async bulkCreate(tenantId: string, records: { employeeId: string; date: string; clockIn?: string; clockOut?: string; notes?: string }[]) {
    const created: any[] = [];

    for (const r of records) {
      const date = new Date(r.date);
      date.setHours(0, 0, 0, 0);

      const record = await this.prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: r.employeeId, date } },
        create: {
          tenantId,
          employeeId: r.employeeId,
          date,
          clockIn: r.clockIn ? new Date(r.clockIn) : undefined,
          clockOut: r.clockOut ? new Date(r.clockOut) : undefined,
          clockInMethod: ClockInMethod.MANUAL,
          clockOutMethod: r.clockOut ? ClockInMethod.MANUAL : undefined,
          status: AttendanceStatus.PRESENT,
          notes: r.notes,
          isApproved: true,
        },
        update: {
          clockIn: r.clockIn ? new Date(r.clockIn) : undefined,
          clockOut: r.clockOut ? new Date(r.clockOut) : undefined,
          notes: r.notes,
          isApproved: true,
        },
      });

      created.push(record);
    }

    return created;
  }

  private async validateGeofence(
    tenantId: string,
    employeeId: string,
    method: ClockInMethod,
    lat?: number,
    lng?: number,
  ) {
    // Geofencing applies to GPS-based attendance (BR-01); QR/Face/Fingerprint
    // carry their own validation, and MANUAL bypasses location checks.
    if (method !== ClockInMethod.GPS) return;
    if (!lat || !lng) return;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { workLocationId: true },
    });

    if (!employee?.workLocationId) return;

    const location = await this.prisma.workLocation.findUnique({
      where: { id: employee.workLocationId },
    });

    if (!location || location.isFlexible) return;

    const distance = this.haversineDistance(
      lat,
      lng,
      Number(location.latitude),
      Number(location.longitude),
    );

    if (distance > location.radiusMeters) {
      throw new BadRequestException(
        `Location is outside the allowed geofence (${location.radiusMeters}m radius from ${location.name})`,
      );
    }
  }

  private async findAssignedShift(tenantId: string, employeeId: string, date: Date) {
    const entry = await this.prisma.rosterEntry.findUnique({
      where: { employeeId_date: { employeeId, date } },
      include: { shift: true },
    });

    return entry?.shift ?? null;
  }

  private calculateLateMinutes(clockIn: Date, shiftStart: string, graceMinutes: number = 15): number {
    const [h, m] = shiftStart.split(':').map(Number);
    const shiftStartDate = new Date(clockIn);
    shiftStartDate.setHours(h, m, 0, 0);

    const diffMs = clockIn.getTime() - shiftStartDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    return Math.max(0, diffMinutes - graceMinutes);
  }

  private calculateEarlyLeaveMinutes(clockOut: Date, shiftEnd: string): number {
    const [h, m] = shiftEnd.split(':').map(Number);
    const shiftEndDate = new Date(clockOut);
    shiftEndDate.setHours(h, m, 0, 0);

    const diffMs = shiftEndDate.getTime() - clockOut.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  private calculateOvertimeMinutes(clockIn: Date, clockOut: Date, shift: { startTime: string; endTime: string; overtimeBeforeMinutes?: number | null; overtimeAfterMinutes?: number | null }): number {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(clockIn);
    shiftStart.setHours(sh, sm, 0, 0);

    const shiftEnd = new Date(clockOut);
    shiftEnd.setHours(eh, em, 0, 0);

    const beforeMinutes = Math.max(0, Math.floor((shiftStart.getTime() - clockIn.getTime()) / 60000) - (shift.overtimeBeforeMinutes || 0));
    const afterMinutes = Math.max(0, Math.floor((clockOut.getTime() - shiftEnd.getTime()) / 60000) - (shift.overtimeAfterMinutes || 0));

    return beforeMinutes + afterMinutes;
  }

  private async assertPayrollPeriodOpen(tenantId: string, date: Date) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        startDate: { lte: date },
        endDate: { gte: date },
        status: PayrollPeriodStatus.LOCKED,
      },
    });

    if (period) {
      throw new ForbiddenException('Cannot modify records in a locked payroll period');
    }
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
