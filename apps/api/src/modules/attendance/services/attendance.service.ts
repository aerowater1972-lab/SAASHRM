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
import { OvertimeService } from './overtime.service';
import { BiometricService } from './biometric.service';
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
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly geofenceRadius: number;
  private readonly overtimeMinMinutes: number;
  private readonly maxGpsAccuracy: number;
  private readonly maxClockSkewMs: number;
  private readonly maxTravelSpeedKmh: number;

  private static readonly ANTI_SPOOF_CACHE_TTL_MS = 60_000;
  private readonly antiSpoofCache = new Map<string, { value: AntiSpoofThresholds; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly overtimeService: OvertimeService,
    private readonly biometricService: BiometricService,
  ) {
    // ConfigService returns raw strings for env vars, so coerce to numbers to
    // keep the anti-spoof thresholds strictly numeric everywhere downstream.
    this.geofenceRadius = Number(this.config.get('GEOFENCE_RADIUS_METERS', 100));
    this.overtimeMinMinutes = Number(this.config.get('OVERTIME_MIN_MINUTES', 30));
    // Anti-spoof thresholds.
    this.maxGpsAccuracy = Number(this.config.get('GPS_ACCURACY_MAX_METERS', 50));
    this.maxClockSkewMs = Number(this.config.get('GPS_CLIENT_TS_SKEW_MS', 2 * 60 * 1000));
    this.maxTravelSpeedKmh = Number(this.config.get('GPS_MAX_TRAVEL_SPEED_KMH', 200));
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
    const clockInFlags = await this.detectLocationSuspicion(
      tenantId,
      employeeId,
      dto.method,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.clientTimestamp,
    );

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
      const result = await this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
      if (!result.matched) {
        throw new BadRequestException(`Face verification failed (score ${result.score.toFixed(3)})`);
      }
    }

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
    const clockOutFlags = await this.detectLocationSuspicion(
      tenantId,
      employeeId,
      dto.method,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.clientTimestamp,
    );

    if (dto.method === ClockInMethod.FACE) {
      if (!dto.embedding) {
        throw new BadRequestException('Face embedding is required for FACE clock-out');
      }
      const result = await this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
      if (!result.matched) {
        throw new BadRequestException(`Face verification failed (score ${result.score.toFixed(3)})`);
      }
    }

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
  private async getAntiSpoofThresholds(tenantId: string): Promise<AntiSpoofThresholds> {
    const cached = this.antiSpoofCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const defaults: AntiSpoofThresholds = {
      maxGpsAccuracy: this.maxGpsAccuracy,
      maxClockSkewMs: this.maxClockSkewMs,
      maxTravelSpeedKmh: this.maxTravelSpeedKmh,
    };

    let value = defaults;
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      const settings = (tenant?.settings ?? {}) as Record<string, any>;
      const overrides = (settings.antiSpoof ?? {}) as Record<string, unknown>;
      value = {
        maxGpsAccuracy: this.positiveNumberOr(overrides.maxGpsAccuracy, defaults.maxGpsAccuracy),
        maxClockSkewMs: this.positiveNumberOr(overrides.maxClockSkewMs, defaults.maxClockSkewMs),
        maxTravelSpeedKmh: this.positiveNumberOr(
          overrides.maxTravelSpeedKmh,
          defaults.maxTravelSpeedKmh,
        ),
      };
    } catch {
      value = defaults;
    }

    this.antiSpoofCache.set(tenantId, {
      value,
      expiresAt: Date.now() + AttendanceService.ANTI_SPOOF_CACHE_TTL_MS,
    });
    return value;
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
    const effective = await this.getAntiSpoofThresholds(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const overrides = ((tenant?.settings as Record<string, any>)?.antiSpoof ?? {}) as Record<
      string,
      unknown
    >;
    return {
      effective,
      overrides,
      defaults: {
        maxGpsAccuracy: this.maxGpsAccuracy,
        maxClockSkewMs: this.maxClockSkewMs,
        maxTravelSpeedKmh: this.maxTravelSpeedKmh,
      },
    };
  }

  /**
   * Persist per-tenant anti-spoof overrides. Only positive numeric values are
   * stored; passing null/omitted for a field clears that override.
   */
  async updateAntiSpoofSettings(
    tenantId: string,
    input: {
      maxGpsAccuracy?: number | null;
      maxClockSkewMs?: number | null;
      maxTravelSpeedKmh?: number | null;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings ?? {}) as Record<string, any>;
    const antiSpoof: Record<string, number> = { ...(settings.antiSpoof ?? {}) };

    const apply = (key: 'maxGpsAccuracy' | 'maxClockSkewMs' | 'maxTravelSpeedKmh') => {
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

    if (method !== ClockInMethod.GPS) return flags;
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
      const prevTs = (prev.clockOutClientTs ?? prev.clockInClientTs ?? prev.clockOut ?? prev.clockIn) as
        | Date
        | null;
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
