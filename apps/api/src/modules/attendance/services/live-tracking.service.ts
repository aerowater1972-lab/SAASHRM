import { Injectable, NotFoundException, BadRequestException, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { MailService } from '@modules/integrations/services/mail.service';
import { LocationPingDto, CreateFieldTerritoryDto, UpdateFieldTerritoryDto, UpdateLiveTrackingSettingsDto } from '../dto/live-tracking.dto';

@Injectable()
export class LiveTrackingService {
  private readonly logger = new Logger(LiveTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly notification?: NotificationService,
    @Optional() private readonly mail?: MailService,
  ) {}

  // Location Pings
  async recordLocationPing(tenantId: string, employeeId: string, dto: LocationPingDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true, isFieldWorker: true, status: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.isFieldWorker) throw new BadRequestException('Employee is not a field worker');
    if (employee.status !== 'ACTIVE') throw new BadRequestException('Employee not active');

    const ping = await this.prisma.locationPing.create({
      data: {
        tenantId,
        employeeId,
        lat: dto.lat,
        lng: dto.lng,
        accuracyMeters: dto.accuracyMeters,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });

    // Check territory violation
    await this.checkTerritoryViolation(tenantId, employeeId, dto.lat, dto.lng);

    return ping;
  }

  async getLocationPings(tenantId: string, filters: { employeeId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { employeeId, startDate, endDate, page = 1, limit = 50 } = filters;
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.locationPing.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
      }),
      this.prisma.locationPing.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  async getFieldWorkersLive(tenantId: string, _managerId: string) {
    const fieldWorkers = await this.prisma.employee.findMany({
      where: { tenantId, isFieldWorker: true, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        profilePicture: true,
        locationPings: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: { lat: true, lng: true, recordedAt: true, accuracyMeters: true },
        },
      },
    });

    return fieldWorkers.filter(fw => fw.locationPings.length > 0).map(fw => ({
      id: fw.id,
      fullName: fw.fullName,
      employeeId: fw.employeeId,
      profilePicture: fw.profilePicture,
      lastPing: fw.locationPings[0],
    }));
  }

  // Field Territories
  async createTerritory(tenantId: string, dto: CreateFieldTerritoryDto, actorId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Validate GeoJSON
    let geoJson;
    try {
      geoJson = JSON.parse(dto.boundaryGeoJson);
      if (!['Polygon', 'MultiPolygon'].includes(geoJson.type)) {
        throw new BadRequestException('Boundary must be Polygon or MultiPolygon');
      }
    } catch {
      throw new BadRequestException('Invalid GeoJSON');
    }

    const territory = await this.prisma.fieldTerritory.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        territoryName: dto.territoryName,
        boundaryGeoJson: dto.boundaryGeoJson,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'attendance',
      entity: 'field_territory',
      entityId: territory.id,
      action: 'CREATE',
      changedBy: actorId,
    });

    return territory;
  }

  async listTerritories(tenantId: string) {
    return this.prisma.fieldTerritory.findMany({
      where: { tenantId },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTerritory(tenantId: string, id: string) {
    return this.prisma.fieldTerritory.findFirst({
      where: { id, tenantId },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async updateTerritory(tenantId: string, id: string, dto: UpdateFieldTerritoryDto, actorId: string) {
    const territory = await this.prisma.fieldTerritory.findFirst({ where: { id, tenantId } });
    if (!territory) throw new NotFoundException('Territory not found');

    if (dto.boundaryGeoJson) {
      try {
        const geoJson = JSON.parse(dto.boundaryGeoJson);
        if (!['Polygon', 'MultiPolygon'].includes(geoJson.type)) {
          throw new BadRequestException('Boundary must be Polygon or MultiPolygon');
        }
      } catch {
        throw new BadRequestException('Invalid GeoJSON');
      }
    }

    const updated = await this.prisma.fieldTerritory.update({
      where: { id },
      data: { territoryName: dto.territoryName, boundaryGeoJson: dto.boundaryGeoJson },
    });

    await this.audit.ingest({
      tenantId,
      module: 'attendance',
      entity: 'field_territory',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });

    return updated;
  }

  async deleteTerritory(tenantId: string, id: string, actorId: string) {
    await this.prisma.fieldTerritory.delete({ where: { id, tenantId } });
    await this.audit.ingest({
      tenantId,
      module: 'attendance',
      entity: 'field_territory',
      entityId: id,
      action: 'DELETE',
      changedBy: actorId,
    });
    return { deleted: true };
  }

  /** Daftar pelanggaran wilayah (antrian moderasi) untuk dashboard admin. */
  async listViolations(
    tenantId: string,
    filters: { employeeId?: string; notified?: boolean; startDate?: string; endDate?: string; page?: number; limit?: number } = {},
  ) {
    const { employeeId, notified, startDate, endDate, page = 1, limit = 50 } = filters;
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (typeof notified === 'boolean') where.notified = notified;
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.territoryViolation.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(200, Math.max(1, limit)),
        include: {
          employee: { select: { id: true, fullName: true, employeeId: true } },
          territory: { select: { id: true, territoryName: true } },
        },
      }),
      this.prisma.territoryViolation.count({ where }),
    ]);
    return { data, total, page, pageSize: Math.min(200, Math.max(1, limit)) };
  }

  // Territory Violation Check
  private async checkTerritoryViolation(tenantId: string, employeeId: string, lat: number, lng: number) {
    const territory = await this.prisma.fieldTerritory.findFirst({
      where: { employeeId, tenantId },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });

    if (!territory) return; // No territory assigned

    const boundary = JSON.parse(territory.boundaryGeoJson);
    const inside = this.isPointInPolygon([lng, lat], boundary);

    if (!inside) {
      const distanceMeters = this.calculateDistanceToPolygon([lng, lat], boundary);
      // Log violation, then notify the responsible HR/manager (best-effort).
      const violation = await this.prisma.territoryViolation.create({
        data: {
          tenantId,
          employeeId,
          territoryId: territory.id,
          lat,
          lng,
          distanceMeters,
          recordedAt: new Date(),
        },
      });
      await this.notifyTerritoryViolation(tenantId, {
        employeeName: territory.employee?.fullName ?? employeeId,
        territoryName: territory.territoryName,
        distanceMeters,
        lat,
        lng,
        violationId: violation.id,
      });
    }
  }

  /**
   * Kirim notifikasi pelanggaran wilayah ke HR admin (in-app + email).
   * Best-effort: kegagalan kirim TIDAK menggagalkan pencatatan ping/violation.
   * Ditandai `notified = true` pada baris violation bila pengiriman berhasil.
   */
  private async notifyTerritoryViolation(
    tenantId: string,
    info: { employeeName: string; territoryName: string; distanceMeters: number; lat: number; lng: number; violationId: string },
  ) {
    const title = 'Pelanggaran wilayah kerja';
    const body =
      `${info.employeeName} berada ±${Math.round(info.distanceMeters)} m di luar wilayah "${info.territoryName}". ` +
      `Lokasi: ${info.lat.toFixed(5)}, ${info.lng.toFixed(5)}.`;
    try {
      // HR admin = user dengan permission attendance / live-tracking:read.
      const recipients = await (this.prisma as any).user.findMany({
        where: {
          tenantId,
          userRoles: { some: { role: { rolePermissions: { some: { permission: { module: 'attendance', action: 'live-tracking:read' } } } } } },
        },
        select: { id: true, email: true },
      }).catch(() => []);

      let notifiedAny = false;
      for (const u of recipients as Array<{ id: string; email?: string | null }>) {
        if (this.notification) {
          await this.notification.send({
            tenantId,
            userId: u.id,
            templateKey: 'attendance.territory.violation',
            title,
            body,
            payload: { violationId: info.violationId, territoryName: info.territoryName, distanceMeters: info.distanceMeters },
          });
          notifiedAny = true;
        }
        if (this.mail && u.email) {
          await this.mail.sendMail({ to: u.email, subject: `[Live Tracking] ${title}`, text: body });
        }
      }
      if (notifiedAny) {
        await this.prisma.territoryViolation.update({
          where: { id: info.violationId },
          data: { notified: true },
        });
        this.logger.log(`Pelanggaran wilayah dinotifikasi (${recipients.length} penerima): ${info.employeeName}`);
      }
    } catch (err) {
      this.logger.warn(`Notifikasi pelanggaran wilayah gagal (${info.violationId}): ${(err as Error).message}`);
    }
  }

  private isPointInPolygon(point: [number, number], polygon: any): boolean {
    // Ray casting algorithm for point-in-polygon
    if (polygon.type === 'Polygon') {
      return this.pointInPolygon(point, polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
      return polygon.coordinates.some((poly: number[][][]) => this.pointInPolygon(point, poly[0]));
    }
    return false;
  }

  private pointInPolygon(point: [number, number], ring: number[][]): boolean {
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

  private calculateDistanceToPolygon(point: [number, number], polygon: any): number {
    // Simplified: return distance to first ring's first point
    const [x, y] = point;
    const [px, py] = polygon.coordinates[0][0];
    return Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2)) * 111000; // rough meters
  }

  // Settings
  async getLiveTrackingSettings(tenantId: string) {
    let settings = await this.prisma.liveTrackingSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      settings = await this.prisma.liveTrackingSettings.create({
        data: { tenantId, pingIntervalMinutes: 15, enabled: true, retentionDays: 90, requireConsent: true },
      });
    }
    return settings;
  }

  async updateLiveTrackingSettings(tenantId: string, dto: UpdateLiveTrackingSettingsDto, actorId: string) {
    const settings = await this.prisma.liveTrackingSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });

    await this.audit.ingest({
      tenantId,
      module: 'attendance',
      entity: 'live_tracking_settings',
      entityId: tenantId,
      action: 'UPDATE',
      changedBy: actorId,
      newValue: dto,
    });

    return settings;
  }

  // 90-day retention cleanup (runs daily at 2 AM)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLocationPings() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await this.prisma.locationPing.deleteMany({
      where: { recordedAt: { lt: cutoffDate } },
    });

    await this.audit.ingest({
      tenantId: 'system',
      module: 'attendance',
      entity: 'location_pings',
      entityId: 'bulk_cleanup',
      action: 'DELETE',
      changedBy: 'system',
      newValue: { deletedCount: result.count, cutoffDate: cutoffDate.toISOString() },
    });
  }
}