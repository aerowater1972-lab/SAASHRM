import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { ClockInDto, ClockInMethod } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { AttendanceFilterDto } from '../dto/attendance-filter.dto';
import { AttendanceCorrectionDto } from '../dto/attendance-correction.dto';
import { CreateWorkLocationDto, UpdateWorkLocationDto } from '../dto/work-location.dto';
import { OvertimeService } from './overtime.service';
import { BiometricService } from './biometric.service';
import { LivenessService } from './liveness.service';
import { QrTokenService } from './qr-token.service';
import { LiveTrackingService } from './live-tracking.service';
import { PushNotificationService } from '@modules/shared/notification/push-notification.service';
import {
  AttendanceStatus,
  PayrollPeriodStatus,
  RequestStatus,
  Prisma,
  AttendanceRecord,
} from '@prisma/client';

export interface AntiSpoofThresholds {
  maxGpsAccuracy: number;
  maxClockSkewMs: number;
  maxTravelSpeedKmh: number;
  faceMatchThreshold: number;
  minLivenessScore: number;
}

/** Konteks request tambahan untuk clock-in/out (bukan bagian DTO). */
export interface ClockRequestContext {
  clientIp?: string;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly geofenceRadius: number;
  private readonly overtimeMinMinutes: number;
  private readonly maxGpsAccuracy: number;
  private readonly maxClockSkewMs: number;
  private readonly maxTravelSpeedKmh: number;
  private readonly faceMatchThreshold: number;
  private readonly minLivenessScore: number;

  private static readonly ANTI_SPOOF_CACHE_TTL_MS = 60_000;
  private readonly antiSpoofCache = new Map<
    string,
    { value: { thresholds: AntiSpoofThresholds; hardBlock: boolean }; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly overtimeService: OvertimeService,
    private readonly biometricService: BiometricService,
    private readonly livenessService: LivenessService,
    private readonly qrTokenService: QrTokenService,
    private readonly liveTrackingService: LiveTrackingService,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    // ConfigService returns raw strings for env vars, so coerce to numbers to
    // keep the anti-spoof thresholds strictly numeric everywhere downstream.
    this.geofenceRadius = Number(this.config.get('GEOFENCE_RADIUS_METERS', 100));
    this.overtimeMinMinutes = Number(this.config.get('OVERTIME_MIN_MINUTES', 30));
    // Anti-spoof thresholds.
    this.maxGpsAccuracy = Number(this.config.get('GPS_ACCURACY_MAX_METERS', 50));
    this.maxClockSkewMs = Number(this.config.get('GPS_CLIENT_TS_SKEW_MS', 2 * 60 * 1000));
    this.maxTravelSpeedKmh = Number(this.config.get('GPS_MAX_TRAVEL_SPEED_KMH', 200));
    this.faceMatchThreshold = Number(this.config.get('FACE_MATCH_THRESHOLD', 0.85));
    this.minLivenessScore = Number(this.config.get('MIN_LIVENESS_SCORE', 0.6));
  }

  async clockIn(tenantId: string, employeeId: string, dto: ClockInDto, ctx?: ClockRequestContext) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.clockIn) {
      throw new BadRequestException('Already clocked in today');
    }

    await this.assertFaceVerificationRequired(tenantId, dto.method);
    await this.validateNetworkRestriction(
      tenantId,
      employeeId,
      dto.method,
      ctx?.clientIp,
      dto.wifiSsid,
    );
    if (dto.method === ClockInMethod.QR) {
      this.qrTokenService.consume(tenantId, employeeId, dto.qrToken);
    }
    await this.validateGeofence(tenantId, employeeId, dto.method, dto.latitude, dto.longitude);
    const clockInFlags = await this.detectLocationSuspicion(
      tenantId,
      employeeId,
      dto.method,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.clientTimestamp,
    );
    await this.enforceAntiSpoofPolicy(tenantId, clockInFlags);

    const ppeFf = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature: 'ppe_mandatory_clock_in' },
    });
    if (ppeFf?.enabled) {
      const expiredPpe = await this.prisma.ppeAssignment.findFirst({
        where: { tenantId, employeeId, status: 'ACTIVE', expiryDate: { not: null, lt: new Date() }, deletedAt: null },
      });
      if (expiredPpe) {
        throw new ForbiddenException(
          `APD ${expiredPpe.ppeType} sudah kedaluwarsa (${expiredPpe.expiryDate?.toISOString().split('T')[0]}) — clock-in diblokir`,
        );
      }
      const hasActivePpe = await this.prisma.ppeAssignment.findFirst({
        where: { tenantId, employeeId, status: 'ACTIVE', deletedAt: null },
      });
      if (!hasActivePpe) {
        throw new ForbiddenException('Tidak memiliki APD aktif — clock-in diblokir');
      }
    }

    if (dto.method === ClockInMethod.FACE) {
      if (!dto.embedding) {
        throw new BadRequestException('Face embedding is required for FACE clock-in');
      }
      await this.livenessService.assertToken(tenantId, employeeId, dto.livenessToken);
      const result = await this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
      if (!result.matched) {
        throw new BadRequestException(`Face verification failed (score ${result.score.toFixed(3)})`);
      }
    }

    const shift = await this.findAssignedShift(tenantId, employeeId, today);

    // Get employee's department for department-level cut-off
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, tenantId },
      select: { employments: { where: { isActive: true }, take: 1, select: { department: true } } },
    });
    const department = employee?.employments?.[0]?.department;

    // Use department-level cut-off if available, otherwise fall back to shift grace period
    const cutOffGraceMinutes = department?.cutOffGraceMinutes ?? shift?.gracePeriodMinutes ?? 15;
    const clockInTime = new Date();
    const lateMinutes = shift ? this.calculateLateMinutes(clockInTime, shift.startTime, cutOffGraceMinutes) : 0;
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
        clockInAccuracy: dto.accuracy,
        clockInClientTs: dto.clientTimestamp ? new Date(dto.clientTimestamp) : undefined,
        clockInPhoto: dto.photo,
        clockInFlags,
        isSuspicious: clockInFlags.length > 0,
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
        clockInAccuracy: dto.accuracy,
        clockInClientTs: dto.clientTimestamp ? new Date(dto.clientTimestamp) : undefined,
        clockInPhoto: dto.photo,
        clockInFlags,
        isSuspicious: clockInFlags.length > 0,
        shiftId: shift?.id,
        status,
        lateMinutes,
        notes: dto.notes,
      },
      include: { employee: true },
    });

    await this.notifyHrOfSuspicion(tenantId, employeeId, clockInFlags);

    return record;
  }

  async clockOut(tenantId: string, employeeId: string, dto: ClockOutDto, ctx?: ClockRequestContext) {
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

    await this.assertFaceVerificationRequired(tenantId, dto.method);
    await this.validateNetworkRestriction(
      tenantId,
      employeeId,
      dto.method,
      ctx?.clientIp,
      dto.wifiSsid,
    );
    if (dto.method === ClockInMethod.QR) {
      this.qrTokenService.consume(tenantId, employeeId, dto.qrToken);
    }
    await this.validateGeofence(tenantId, employeeId, dto.method, dto.latitude, dto.longitude);
    const clockOutFlags = await this.detectLocationSuspicion(
      tenantId,
      employeeId,
      dto.method,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.clientTimestamp,
    );
    await this.enforceAntiSpoofPolicy(tenantId, clockOutFlags);

    if (dto.method === ClockInMethod.FACE) {
      if (!dto.embedding) {
        throw new BadRequestException('Face embedding is required for FACE clock-out');
      }
      await this.livenessService.assertToken(tenantId, employeeId, dto.livenessToken);
      const result = await this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
      if (!result.matched) {
        throw new BadRequestException(`Face verification failed (score ${result.score.toFixed(3)})`);
      }
    }

    const clockOutTime = new Date();
    const shift = record.shiftId
      ? await this.prisma.shift.findUnique({ where: { id: record.shiftId } })
      : null;

    // Get department for early leave threshold
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, tenantId },
      select: { employments: { where: { isActive: true }, take: 1, select: { department: true } } },
    });
    const department = employee?.employments?.[0]?.department;

    // Use department-level cut-off if available, otherwise fall back to shift earlyLeaveThresholdMinutes
    const earlyLeaveThresholdMinutes = department?.cutOffGraceMinutes ?? shift?.earlyLeaveThresholdMinutes ?? 15;

    const earlyLeaveMinutes = shift
      ? this.calculateEarlyLeaveMinutes(clockOutTime, shift.endTime)
      : 0;

    const overtimeMinutes = shift
      ? this.calculateOvertimeMinutes(record.clockIn || clockOutTime, clockOutTime, shift)
      : 0;

    let status = record.status;
    if (earlyLeaveMinutes > earlyLeaveThresholdMinutes) {
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
        clockOutAccuracy: dto.accuracy,
        clockOutClientTs: dto.clientTimestamp ? new Date(dto.clientTimestamp) : undefined,
        clockOutPhoto: dto.photo,
        clockOutFlags,
        isSuspicious: record.isSuspicious || clockOutFlags.length > 0,
        status,
        earlyLeaveMinutes,
        overtimeMinutes: eligibleOvertime,
        notes: dto.notes ? `${record.notes || ''} ${dto.notes}`.trim() : record.notes,
      },
      include: { employee: true },
    });

    // FR-18 / FR-11: lembur dibayar harus dicocokkan dengan rencana yang
    // disetujui (bukan reaktif dari selisih clock-out). Panggil reconcile yang
    // menghitung payableMinutes = MIN(rencana, aktual) dan mengklasifikasi
    // dayType. Tanpa overtime_request yang disetujui, catatan tetap dibuat
    // namun isPaid=false (FR-20 default off).
    if (eligibleOvertime > 0) {
      await this.overtimeService.reconcile(tenantId, employeeId, today, eligibleOvertime);
    }

    await this.notifyHrOfSuspicion(tenantId, employeeId, clockOutFlags);

    return updated;
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

  async findFlagged(tenantId: string, reviewed?: string) {
    const where: Prisma.AttendanceRecordWhereInput = { tenantId, isSuspicious: true };
    if (reviewed === 'true') {
      where.spoofReviewedAt = { not: null };
    } else if (reviewed === 'false') {
      where.spoofReviewedAt = null;
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: { id: true, employeeId: true, fullName: true, email: true },
        },
      },
    });
  }

  async reviewSpoof(tenantId: string, id: string, reviewerId: string, note?: string) {
    const record = await this.prisma.attendanceRecord.findFirst({ where: { id, tenantId } });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    if (!record.isSuspicious) {
      throw new BadRequestException('Record is not flagged as suspicious');
    }

    return this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        spoofReviewedBy: reviewerId,
        spoofReviewedAt: new Date(),
        spoofReviewNote: note,
      },
      include: {
        employee: {
          select: { id: true, employeeId: true, fullName: true, email: true },
        },
      },
    });
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

    // Segregation of duties: pengaju koreksi tak boleh menyetujui sendiri.
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { employeeId: true },
    });
    if (approver?.employeeId && approver.employeeId === correction.requestedBy) {
      throw new ForbiddenException('Tidak dapat menyetujui koreksi sendiri (segregation of duties)');
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

    // Batch: one ranged query per 500-employee chunk instead of one query
    // per employee, then aggregate in memory with identical rules.
    const employeeIds = employees.map((e) => e.id);
    const recordsByEmployee = new Map<string, any[]>();
    const CHUNK_SIZE = 500;
    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      const chunk = employeeIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.prisma.attendanceRecord.findMany({
        where: {
          tenantId,
          employeeId: { in: chunk },
          date: { gte: period.startDate, lte: period.endDate },
        },
        select: { employeeId: true, clockIn: true, status: true, overtimeMinutes: true },
      });
      for (const r of rows) {
        const list = recordsByEmployee.get(r.employeeId) ?? [];
        list.push(r);
        recordsByEmployee.set(r.employeeId, list);
      }
    }

    const summary: Array<{
      employeeId: string;
      presentDays: number;
      lateDays: number;
      leaveDays: number;
      absentDays: number;
      overtimeMinutes: number;
    }> = [];

    const events: Array<{
      name: string;
      aggregateId: string;
      aggregateType: string;
      payload: Record<string, any>;
      tenantId: string;
    }> = [];

    for (const emp of employees) {
      const records = recordsByEmployee.get(emp.id) ?? [];

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

      events.push({
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

    // One bulk enqueue instead of one write per employee.
    if (events.length > 0) {
      await this.eventBus.publishMany(events);
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

  /**
   * Scheduler harian (01:00): menutup otomatis setiap payroll period
   * yang masih OPEN tetapi endDate-nya sudah lewat, di semua tenant.
   * Menutup backlog Epic 2 — sebelumnya closePeriod() hanya bisa dipanggil
   * manual. Kegagalan pada satu periode tidak menghentikan periode lain.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoCloseElapsedPeriods(): Promise<string[]> {
    const elapsed = await this.prisma.payrollPeriod.findMany({
      where: { status: PayrollPeriodStatus.OPEN, endDate: { lt: new Date() } },
      select: { id: true, tenantId: true },
    });

    const closed: string[] = [];
    for (const period of elapsed) {
      try {
        await this.closePeriod(period.tenantId, period.id, 'system');
        closed.push(period.id);
      } catch (err) {
        this.logger.warn(
          `autoCloseElapsedPeriods: gagal menutup periode ${period.id} (tenant ${period.tenantId}): ${(err as Error).message}`,
        );
      }
    }

    if (closed.length > 0) {
      this.logger.log(`autoCloseElapsedPeriods: menutup ${closed.length} periode: ${closed.join(', ')}`);
    }
    return closed;
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

  /**
   * G2: Ringkasan mingguan ESS — grid 7 hari (Senin-Minggu) berisi
   * date, status, clockIn, clockOut, hours, isSuspicious + total.
   */
  async getEssWeekly(tenantId: string, employeeId: string, refDate?: string) {
    const ref = refDate ? new Date(refDate) : new Date();
    ref.setHours(0, 0, 0, 0);
    const dow = (ref.getDay() + 6) % 7; // Senin = 0
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - dow);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, date: { gte: monday, lte: sunday } },
    });
    const byDay = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      const d = new Date(r.date);
      byDay.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, r);
    }

    const days: { date: string; status: string | null; clockIn: Date | null; clockOut: Date | null; hours: number; isSuspicious: boolean }[] = [];
    let totalHours = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = byDay.get(key);
      const hours = rec ? this.attendanceToHours(rec.clockIn, rec.clockOut) : 0;
      totalHours += hours;
      days.push({
        date: key,
        status: rec?.status ?? null,
        clockIn: rec?.clockIn ?? null,
        clockOut: rec?.clockOut ?? null,
        hours: Math.round(hours * 100) / 100,
        isSuspicious: rec?.isSuspicious ?? false,
      });
    }

    return { weekStart: days[0].date, weekEnd: days[6].date, days, totalHours: Math.round(totalHours * 100) / 100 };
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

  // ——— Work Location admin (config untuk geofence + restriksi jaringan G1) ———

  async listWorkLocations(tenantId: string) {
    return this.prisma.workLocation.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async createWorkLocation(tenantId: string, dto: CreateWorkLocationDto) {
    return this.prisma.workLocation.create({
      data: {
        tenantId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters ?? 100,
        isFlexible: dto.isFlexible ?? false,
        allowedIpCidrs: dto.allowedIpCidrs ?? [],
        allowedWifiSsids: dto.allowedWifiSsids ?? [],
      },
    });
  }

  async updateWorkLocation(tenantId: string, id: string, dto: UpdateWorkLocationDto) {
    const existing = await this.prisma.workLocation.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Work location not found');

    return this.prisma.workLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.radiusMeters !== undefined ? { radiusMeters: dto.radiusMeters } : {}),
        ...(dto.isFlexible !== undefined ? { isFlexible: dto.isFlexible } : {}),
        ...(dto.allowedIpCidrs !== undefined ? { allowedIpCidrs: dto.allowedIpCidrs } : {}),
        ...(dto.allowedWifiSsids !== undefined ? { allowedWifiSsids: dto.allowedWifiSsids } : {}),
      },
    });
  }

  private async validateGeofence(
    tenantId: string,
    employeeId: string,
    method: ClockInMethod,
    lat?: number,
    lng?: number,
  ) {
    // BR-01 + perbaikan gap Q1 audit Talenta: geofence kini berlaku untuk
    // SEMUA metode self-service (GPS/FACE/QR/FINGERPRINT) begitu koordinat
    // dikirim — sebelumnya hanya GPS, sehingga FACE/QR/FINGERPRINT bisa
    // lolos dari radius lokasi kerja. MANUAL (input HR/admin) tetap bypass.
    if (method === ClockInMethod.MANUAL) return;
    if (lat == null || lng == null) return;

    // 1. Work location radius check (office geofence)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { workLocationId: true },
    });

    if (employee?.workLocationId) {
      const location = await this.prisma.workLocation.findUnique({
        where: { id: employee.workLocationId },
      });

      if (location && !location.isFlexible) {
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
    }

    // 2. Field territory polygon check (Talenta "clock in/out berbasis lokasi")
    // Karyawan lapangan dengan wilayah kerja (FieldTerritory) harus clock in/out
    // di dalam polygon wilayah yang ditetapkan.
    const territory = await this.liveTrackingService.getTerritoryForEmployee(
      tenantId,
      employeeId,
    );
    if (territory) {
      const boundary = JSON.parse(territory.boundaryGeoJson);
      const inside = this.isPointInPolygonInAttendance([lng, lat], boundary);
      if (!inside) {
        throw new BadRequestException(
          `Location is outside the assigned field territory "${territory.territoryName}". Clock in/out hanya diperbolehkan di dalam wilayah kerja.`,
        );
      }
    }
  }

  /**
   * Point-in-polygon (ray casting) untuk validasi wilayah kerja saat clock-in/out.
   */
  private isPointInPolygonInAttendance(point: [number, number], polygon: any): boolean {
    if (polygon.type === 'Polygon') {
      return this.pointInRing(point, polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
      return polygon.coordinates.some((poly: number[][][]) => this.pointInRing(point, poly[0]));
    }
    return false;
  }

  private pointInRing(point: [number, number], ring: number[][]): boolean {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * G1 parity (Talenta "restrict attendance by office network"): bila lokasi
   * kerja karyawan mengisi allowlist IP-CIDR dan/atau SSID WiFi, clock-in/out
   * non-MANUAL hanya diterima dari jaringan tersebut. Karyawan tanpa lokasi
   * kerja, lokasi isFlexible, atau lokasi tanpa allowlist tidak direstriksi.
   */
  private async validateNetworkRestriction(
    tenantId: string,
    employeeId: string,
    method: ClockInMethod,
    clientIp?: string,
    wifiSsid?: string,
  ) {
    if (method === ClockInMethod.MANUAL) return;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, tenantId },
      select: {
        workLocation: {
          select: { name: true, allowedIpCidrs: true, allowedWifiSsids: true },
        },
      },
    });

    const location = employee?.workLocation;
    if (!location) return;

    const cidrs = (location.allowedIpCidrs ?? []).map((s) => s.trim()).filter(Boolean);
    const ssids = (location.allowedWifiSsids ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
    // Tidak ada restriksi dikonfigurasi → lewat.
    if (cidrs.length === 0 && ssids.length === 0) return;

    const ipOk = clientIp ? cidrs.some((rule) => this.ipMatches(clientIp, rule)) : false;
    const ssidOk = wifiSsid ? ssids.includes(wifiSsid.trim().toLowerCase()) : false;

    if (!ipOk && !ssidOk) {
      throw new ForbiddenException(
        `Absensi hanya diterima dari jaringan kantor "${location.name}" (IP/SSID terdaftar). ` +
          `IP terdeteksi: ${clientIp ?? 'tidak diketahui'}.`,
      );
    }
  }

  /** Cocokkan IP terhadap rule exact-IP atau CIDR IPv4. IPv6: exact match saja. */
  private ipMatches(ip: string, rule: string): boolean {
    const norm = (v: string) => v.replace(/^::ffff:/i, '').trim().toLowerCase();
    const ipNorm = norm(ip);
    const ruleNorm = norm(rule);

    if (!ruleNorm.includes('/')) return ipNorm === ruleNorm;

    const [base, bitsStr] = ruleNorm.split('/');
    const bits = Number(bitsStr);
    const a = this.ipv4ToInt(ipNorm);
    const b = this.ipv4ToInt(base);
    if (a == null || b == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xffffffff : (~0 << (32 - bits)) >>> 0;
    return ((a & mask) >>> 0) === ((b & mask) >>> 0);
  }

  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return null;
      const v = Number(p);
      if (v < 0 || v > 255) return null;
      n = ((n << 8) | v) >>> 0;
    }
    return n;
  }

  /**
   * Anti-spoof / fake-GPS defenses for GPS-based attendance.
   * 1) Accuracy gate — implausibly coarse or missing GPS accuracy.
   * 2) Client timestamp skew — time-travel / clock manipulation.
   * 3) Speed sanity — physically impossible travel since the last recorded point.
   * Non-GPS methods (FACE/FINGERPRINT/QR) and MANUAL bypass location checks.
   *
   * Returns a list of human-readable suspicion flags (empty = clean). The record
   * is still saved; HR reviews flagged records instead of the employee being
   * hard-blocked.
   */
  /**
   * Resolve anti-spoof thresholds for a tenant. Per-tenant overrides live in
   * `Tenant.settings.antiSpoof` and fall back to the env-level defaults. Values
   * are cached briefly to avoid a DB round-trip on every clock event.
   */
  private async getAntiSpoofConfig(tenantId: string): Promise<{
    thresholds: AntiSpoofThresholds;
    hardBlock: boolean;
  }> {
    const cached = this.antiSpoofCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const defaults: AntiSpoofThresholds = {
      maxGpsAccuracy: this.maxGpsAccuracy,
      maxClockSkewMs: this.maxClockSkewMs,
      maxTravelSpeedKmh: this.maxTravelSpeedKmh,
      faceMatchThreshold: this.faceMatchThreshold,
      minLivenessScore: this.minLivenessScore,
    };

    let value: { thresholds: AntiSpoofThresholds; hardBlock: boolean } = {
      thresholds: defaults,
      hardBlock: false,
    };
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      const settings = (tenant?.settings ?? {}) as Record<string, any>;
      const overrides = (settings.antiSpoof ?? {}) as Record<string, unknown>;
      value = {
        thresholds: {
          maxGpsAccuracy: this.positiveNumberOr(overrides.maxGpsAccuracy, defaults.maxGpsAccuracy),
          maxClockSkewMs: this.positiveNumberOr(overrides.maxClockSkewMs, defaults.maxClockSkewMs),
          maxTravelSpeedKmh: this.positiveNumberOr(
            overrides.maxTravelSpeedKmh,
            defaults.maxTravelSpeedKmh,
          ),
          faceMatchThreshold: this.positiveNumberOr(
            overrides.faceMatchThreshold,
            defaults.faceMatchThreshold,
          ),
          minLivenessScore: this.positiveNumberOr(
            overrides.minLivenessScore,
            defaults.minLivenessScore,
          ),
        },
        // hardBlock=true → absensi mencurigakan DITOLAK (bukan hanya ditandai).
        hardBlock: overrides.hardBlock === true,
      };
    } catch {
      value = { thresholds: defaults, hardBlock: false };
    }

    this.antiSpoofCache.set(tenantId, {
      value,
      expiresAt: Date.now() + AttendanceService.ANTI_SPOOF_CACHE_TTL_MS,
    });
    return value;
  }

  private async getAntiSpoofThresholds(tenantId: string): Promise<AntiSpoofThresholds> {
    return (await this.getAntiSpoofConfig(tenantId)).thresholds;
  }

  /**
   * Tegakkan kebijakan anti-spoof setelah flag terdeteksi: bila tenant
   * mengaktifkan `antiSpoof.hardBlock`, absensi DITOLAK; default tetap
   * flag-only (record disimpan + ditandai untuk review HR).
   */
  private async enforceAntiSpoofPolicy(tenantId: string, flags: string[]): Promise<void> {
    if (flags.length === 0) return;
    const { hardBlock } = await this.getAntiSpoofConfig(tenantId);
    if (hardBlock) {
      throw new ForbiddenException(
        `Absensi diblokir oleh kebijakan anti-spoof tenant: ${flags.join('; ')}`,
      );
    }
  }

  /**
   * Kebijakan wajib verifikasi wajah (anti buddy-punching) — opt-in per
   * tenant via FeatureFlag `attendance_require_face`. Bila aktif, seluruh
   * metode self-service selain FACE ditolak; MANUAL (input HR) dikecualikan.
   */
  private async assertFaceVerificationRequired(
    tenantId: string,
    method: ClockInMethod,
  ): Promise<void> {
    if (method === ClockInMethod.MANUAL) return;
    const ff = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature: 'attendance_require_face' },
    });
    if (ff?.enabled && method !== ClockInMethod.FACE) {
      throw new ForbiddenException(
        'Perusahaan mewajibkan verifikasi wajah (FACE + liveness) untuk absensi — hubungi HR jika bermasalah',
      );
    }
  }

  private positiveNumberOr(candidate: unknown, fallback: number): number {
    const n = typeof candidate === 'number' ? candidate : Number(candidate);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  /**
   * Return the effective anti-spoof thresholds for a tenant plus the raw stored
   * overrides and env-level defaults, for the admin settings UI.
   */
  async getAntiSpoofSettings(tenantId: string) {
    const { thresholds, hardBlock } = await this.getAntiSpoofConfig(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const overrides = ((tenant?.settings as Record<string, any>)?.antiSpoof ?? {}) as Record<
      string,
      unknown
    >;
    return {
      effective: { ...thresholds, hardBlock },
      overrides,
      defaults: {
        maxGpsAccuracy: this.maxGpsAccuracy,
        maxClockSkewMs: this.maxClockSkewMs,
        maxTravelSpeedKmh: this.maxTravelSpeedKmh,
        faceMatchThreshold: this.faceMatchThreshold,
        minLivenessScore: this.minLivenessScore,
        hardBlock: false,
      },
    };
  }

  /**
   * Persist per-tenant anti-spoof overrides. Only positive numeric values are
   * stored; passing null/omitted for a field clears that override.
   * `hardBlock` (boolean) mengubah kebijakan flag-only → tolak absensi.
   */
  async updateAntiSpoofSettings(
    tenantId: string,
    input: {
      maxGpsAccuracy?: number | null;
      maxClockSkewMs?: number | null;
      maxTravelSpeedKmh?: number | null;
      hardBlock?: boolean | null;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings ?? {}) as Record<string, any>;
    const antiSpoof: Record<string, number | boolean> = { ...(settings.antiSpoof ?? {}) };

    const apply = (
      key:
        | 'maxGpsAccuracy'
        | 'maxClockSkewMs'
        | 'maxTravelSpeedKmh'
        | 'faceMatchThreshold'
        | 'minLivenessScore',
    ) => {
      if (!(key in input)) return;
      const val = input[key];
      if (val == null) {
        delete antiSpoof[key];
        return;
      }
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) {
        throw new BadRequestException(`${key} must be a positive number`);
      }
      antiSpoof[key] = n;
    };
    apply('maxGpsAccuracy');
    apply('maxClockSkewMs');
    apply('maxTravelSpeedKmh');
    apply('faceMatchThreshold');
    apply('minLivenessScore');

    if ('hardBlock' in input) {
      const val = input.hardBlock;
      if (val == null) {
        delete antiSpoof.hardBlock;
      } else {
        antiSpoof.hardBlock = Boolean(val);
      }
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...settings, antiSpoof } },
    });

    this.antiSpoofCache.delete(tenantId);
    return this.getAntiSpoofSettings(tenantId);
  }

  private async detectLocationSuspicion(
    tenantId: string,
    employeeId: string,
    method: ClockInMethod,
    lat?: number,
    lng?: number,
    accuracy?: number,
    clientTimestamp?: string,
  ): Promise<string[]> {
    const flags: string[] = [];

    // Anti-spoof berlaku untuk SEMUA metode self-service yang membawa
    // koordinat (mobile FACE/QR ikut mengirim lat/lng+accuracy) — bukan
    // hanya GPS. MANUAL (input HR) bypass.
    if (method === ClockInMethod.MANUAL) return flags;
    if (lat == null || lng == null) return flags;

    const thresholds = await this.getAntiSpoofThresholds(tenantId);

    if (accuracy == null || accuracy > thresholds.maxGpsAccuracy) {
      flags.push(
        `GPS accuracy too low (${accuracy ?? 'unknown'}m, max ${thresholds.maxGpsAccuracy}m) — possible mock-location app.`,
      );
    }

    if (clientTimestamp) {
      const clientTs = new Date(clientTimestamp).getTime();
      const skew = Math.abs(Date.now() - clientTs);
      if (skew > thresholds.maxClockSkewMs) {
        flags.push(
          `Client clock out of sync (skew ${Math.round(skew / 1000)}s) — possible device time manipulation.`,
        );
      }
    }

    const prev = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, OR: [{ clockInLat: { not: null } }, { clockOutLat: { not: null } }] },
      orderBy: { date: 'desc' },
    });

    if (prev) {
      const prevLat = prev.clockOutLat ?? prev.clockInLat;
      const prevLng = prev.clockOutLng ?? prev.clockInLng;
      const prevTs = (prev.clockOutClientTs ?? prev.clockInClientTs ?? prev.clockOut ?? prev.clockIn) as Date | null;
      if (prevLat != null && prevLng != null && prevTs) {
        const distanceKm = this.haversineDistance(Number(prevLat), Number(prevLng), lat, lng) / 1000;
        const elapsedH = Math.max((Date.now() - new Date(prevTs).getTime()) / 3_600_000, 1 / 60);
        const speed = distanceKm / elapsedH;
        if (speed > thresholds.maxTravelSpeedKmh) {
          flags.push(
            `Impossible travel speed (${speed.toFixed(0)} km/h) since last check-in — possible GPS spoofing.`,
          );
        }
      }
    }

    return flags;
  }

  /**
   * R1: Summary tersegmentasi per karyawan / departemen untuk template gaji.
   */
  async aggregatePayrollSummary(
    tenantId: string,
    periodId: string,
    groupBy: 'employeeId' | 'department' = 'employeeId',
  ) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId, tenantId },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, date: { gte: period.startDate, lte: period.endDate } },
      select: {
        employeeId: true,
        status: true,
        clockIn: true,
        clockOut: true,
        overtimeMinutes: true,
        isSuspicious: true,
        employee: { select: { employments: { select: { department: { select: { name: true } } } } } },
      },
    });

    const overtime = await this.prisma.overtimeRecord.findMany({
      where: { tenantId, date: { gte: period.startDate, lte: period.endDate } },
      select: { employeeId: true, actualMinutes: true },
    });

    const deptMap = new Map<string, { presentHours: number; overtimeMinutes: number; absentDays: number; lateDays: number }>();
    const empMap = new Map<string, { department: string; presentHours: number; overtimeMinutes: number; absentDays: number; lateDays: number }>();

    for (const rec of attendance) {
      const emp = empMap.get(rec.employeeId) ?? {
        department: (rec as any).employee?.employments?.[0]?.department?.name ?? 'UNKNOWN',
        presentHours: 0,
        overtimeMinutes: 0,
        absentDays: 0,
        lateDays: 0,
      };
      const dept = deptMap.get(emp.department) ?? {
        presentHours: 0,
        overtimeMinutes: 0,
        absentDays: 0,
        lateDays: 0,
      };

      if (rec.status === 'PRESENT') {
        emp.presentHours += this.attendanceToHours(rec.clockIn, rec.clockOut);
        dept.presentHours += this.attendanceToHours(rec.clockIn, rec.clockOut);
      } else if (rec.status === 'ABSENT') {
        emp.absentDays++;
        dept.absentDays++;
      } else if (rec.status === 'LATE') {
        emp.lateDays++;
        dept.lateDays++;
      }
      emp.overtimeMinutes += rec.overtimeMinutes ?? 0;
      dept.overtimeMinutes += rec.overtimeMinutes ?? 0;
      empMap.set(rec.employeeId, emp);
      deptMap.set(emp.department, dept);
    }

    for (const ov of overtime) {
      const g = empMap.get(ov.employeeId);
      if (g) {
        g.overtimeMinutes += ov.actualMinutes;
        const dept = deptMap.get(g.department);
        if (dept) dept.overtimeMinutes += ov.actualMinutes;
      }
    }

    const rows = groupBy === 'employeeId'
      ? Array.from(empMap.entries()).map(([employeeId, g]) => ({
          employeeId,
          department: g.department,
          presentHours: Math.round(g.presentHours * 100) / 100,
          overtimeMinutes: g.overtimeMinutes,
          overtimeHours: Math.round((g.overtimeMinutes / 60) * 100) / 100,
          absentDays: g.absentDays,
          lateDays: g.lateDays,
          paymentHours: Math.round((g.presentHours + g.overtimeMinutes / 60) * 100) / 100,
        }))
      : Array.from(deptMap.entries()).map(([department, g]) => ({
          department,
          presentHours: Math.round(g.presentHours * 100) / 100,
          overtimeMinutes: g.overtimeMinutes,
          overtimeHours: Math.round((g.overtimeMinutes / 60) * 100) / 100,
          absentDays: g.absentDays,
          lateDays: g.lateDays,
          paymentHours: Math.round((g.presentHours + g.overtimeMinutes / 60) * 100) / 100,
        }));

    return { groupBy, rows };
  }

  /**
   * R1: Ringkuman absensi+lembur untuk payroll period.
   * Output cocok langsung dipakai template gaji tanpa join ulang besar-besaran.
   */
  async getPayrollSummary(
    tenantId: string,
    periodId: string,
    employeeId?: string,
  ) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId, tenantId },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status === PayrollPeriodStatus.CLOSED || period.status === PayrollPeriodStatus.LOCKED) {
      throw new ForbiddenException('Payroll period already closed or locked');
    }

    const where: any = { tenantId, date: { gte: period.startDate, lte: period.endDate } };
    if (employeeId) where.employeeId = employeeId;

    const attendance = await this.prisma.attendanceRecord.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        status: true,
        clockIn: true,
        clockOut: true,
        overtimeMinutes: true,
        isSuspicious: true,
      },
    });

    const overtime = await this.prisma.overtimeRecord.findMany({
      where: { tenantId, date: { gte: period.startDate, lte: period.endDate }, ...employeeId ? { employeeId } : {} },
      select: { employeeId: true, actualMinutes: true },
    });

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: { in: [RequestStatus.APPROVED, RequestStatus.PENDING] },
        OR: [
          { startDate: { lte: period.endDate }, endDate: { gte: period.startDate } },
        ],
      },
      select: { id: true, employeeId: true, startDate: true, endDate: true, leaveTypeId: true, status: true },
    });

    const grouped = new Map<string, {
      totalWorkingDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      presentHours: number;
      overtimeMinutes: number;
      suspectedDays: number;
      leaveDays: number;
      approvedLeaveDays: number;
    }>();

    for (const rec of attendance) {
      const id = rec.employeeId;
      let g = grouped.get(id);
      if (!g) {
        g = {
          totalWorkingDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          presentHours: 0,
          overtimeMinutes: 0,
          suspectedDays: 0,
          leaveDays: 0,
          approvedLeaveDays: 0,
        };
        grouped.set(id, g);
      }
      g.totalWorkingDays++;
      if (rec.status === 'PRESENT') {
        g.presentDays++;
        const hours = this.attendanceToHours(rec.clockIn, rec.clockOut);
        g.presentHours += hours;
      } else if (rec.status === 'ABSENT') {
        g.absentDays++;
      } else if (rec.status === 'LATE') {
        g.lateDays++;
      }
      if (rec.isSuspicious) g.suspectedDays++;
    }

    for (const ov of overtime) {
      const g = grouped.get(ov.employeeId);
      if (g) g.overtimeMinutes += ov.actualMinutes;
    }

    const leaveIds = new Set(leaveRequests.map((l) => l.employeeId));
    for (const [id, g] of grouped) {
      if (leaveIds.has(id)) {
        g.leaveDays++;
        const days = leaveRequests.filter((l) => l.employeeId === id && l.status === RequestStatus.APPROVED);
        g.approvedLeaveDays = days.length;
      }
    }

    const rows = Array.from(grouped.entries()).map(([employeeId, g]) => ({
      employeeId,
      totalWorkingDays: g.totalWorkingDays,
      presentDays: g.presentDays,
      absentDays: g.absentDays,
      lateDays: g.lateDays,
      presentHours: Math.round(g.presentHours * 100) / 100,
      overtimeMinutes: g.overtimeMinutes,
      overtimeHours: Math.round((g.overtimeMinutes / 60) * 100) / 100,
      suspectedDays: g.suspectedDays,
      leaveDays: g.leaveDays,
      approvedLeaveDays: g.approvedLeaveDays,
      paymentHours: Math.round((g.presentHours + g.overtimeMinutes / 60) * 100) / 100,
    }));

    const total = {
      periodId,
      periodStartDate: period.startDate,
      periodEndDate: period.endDate,
      totalKaryawan: rows.length,
      totalPresentDays: rows.reduce((s, r) => s + r.presentDays, 0),
      totalAbsentDays: rows.reduce((s, r) => s + r.absentDays, 0),
      totalLateDays: rows.reduce((s, r) => s + r.lateDays, 0),
      totalPresentHours: Math.round(rows.reduce((s, r) => s + r.presentHours, 0) * 100) / 100,
      totalOvertimeMinutes: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
      totalPaymentHours: Math.round(rows.reduce((s, r) => s + r.paymentHours, 0) * 100) / 100,
    };

    return { rows, total };
  }

  private attendanceToHours(clockIn: Date | null | undefined, clockOut: Date | null | undefined): number {
    if (!clockIn || !clockOut) return 0;
    const diffMs = clockOut.getTime() - clockIn.getTime();
    return Math.max(0, diffMs / 3600000);
  }

  /**
   * Notify HR (users whose role can approve attendance corrections) that a
   * suspicious GPS attendance was recorded. Best-effort: failures here must not
   * break the clock-in/out flow.
   */
  private async notifyHrOfSuspicion(
    tenantId: string,
    employeeId: string,
    flags: string[],
  ): Promise<void> {
    if (flags.length === 0) return;

    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { fullName: true, employeeId: true },
      });

      const hrUsers = await this.prisma.user.findMany({
        where: {
          tenantId,
          employeeId: { not: null },
          userRoles: {
            some: {
              role: {
                rolePermissions: {
                  some: {
                    permission: { module: 'attendance:correction', action: 'approve' },
                  },
                },
              },
            },
          },
        },
        select: { employeeId: true },
      });

      const recipientIds = Array.from(
        new Set(hrUsers.map((u) => u.employeeId).filter((id): id is string => !!id && id !== employeeId)),
      );
      if (recipientIds.length === 0) return;

      const who = employee ? `${employee.fullName} (${employee.employeeId})` : employeeId;
      const message = `Presensi mencurigakan dari ${who}: ${flags.join(' ')}`;

      await this.prisma.essNotification.createMany({
        data: recipientIds.map((rid) => ({
          employeeId: rid,
          type: 'ATTENDANCE_SPOOF_FLAG',
          message,
        })),
      });

      // G2 parity: selain in-app, kirim push notification (best-effort) ke HR.
      await Promise.all(
        recipientIds.map((rid) =>
          this.pushNotificationService.sendToEmployee(rid, 'Presensi Mencurigakan', message, {
            type: 'ATTENDANCE_SPOOF_FLAG',
            employeeId,
          }),
        ),
      );
    } catch {
      // best-effort notification; ignore failures
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
        status: { in: [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.CLOSED] },
      },
    });

    if (period) {
      throw new ForbiddenException('Cannot modify records in a closed or locked payroll period');
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
