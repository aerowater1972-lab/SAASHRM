import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';

interface HadirrAttendanceItem {
  employeeId: string;
  timestamp: string;
  direction: 'IN' | 'OUT';
  photo?: string;
}

interface HadirrWebhookPayload {
  deviceId: string;
  tenantCode: string;
  timestamp: string;
  items: HadirrAttendanceItem[];
}

@Injectable()
export class HadirrService {
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get<string>('HADIRR_WEBHOOK_SECRET', 'hadirr-dev-secret');
  }

  async handleWebhook(payload: HadirrWebhookPayload, signature?: string) {
    if (!signature || !this.verifySignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const tenant = await this.resolveTenant(payload.tenantCode);
    if (!tenant) throw new BadRequestException(`Unknown tenant code: ${payload.tenantCode}`);

    const deviceId = await this.resolveDevice(payload.deviceId, tenant.id);
    const results = { ingested: 0, skipped: 0, errors: [] as string[] };

    for (const item of payload.items) {
      try {
        await this.ingestItem(tenant.id, deviceId, item);
        results.ingested++;
      } catch (err: any) {
        if (err.message === 'duplicate') {
          results.skipped++;
        } else {
          results.errors.push(`${item.employeeId}: ${err.message}`);
        }
      }
    }

    return results;
  }

  async syncAttendance(tenantId: string, from: Date, to: Date) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, clockInMethod: 'FINGERPRINT', date: { gte: from, lte: to } },
      include: { employee: { select: { fullName: true } } },
      orderBy: { date: 'asc' },
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      total: records.length,
      records: records.map((r) => ({
        employee: r.employee?.fullName,
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        status: r.status,
      })),
    };
  }

  private async ingestItem(tenantId: string, deviceId: string, item: HadirrAttendanceItem) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, employeeId: item.employeeId },
      select: { id: true },
    });
    if (!employee) throw new Error(`Employee not found: ${item.employeeId}`);

    const ts = new Date(item.timestamp);
    const date = new Date(ts);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date } },
    });

    if (existing) {
      if (item.direction === 'OUT' && !existing.clockOut) {
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { clockOut: ts, clockOutMethod: 'FINGERPRINT', clockOutPhoto: item.photo },
        });
        return;
      }
      throw new Error('duplicate');
    }

    if (item.direction === 'IN') {
      await this.prisma.attendanceRecord.create({
        data: {
          tenantId,
          employeeId: employee.id,
          date,
          clockIn: ts,
          clockInMethod: 'FINGERPRINT',
          clockInPhoto: item.photo,
        },
      });
    }
  }

  private async resolveTenant(code: string) {
    return this.prisma.tenant.findFirst({
      where: { OR: [{ domain: code }, { name: code }] },
      select: { id: true },
    });
  }

  private async resolveDevice(deviceId: string, tenantId: string): Promise<string> {
    const device = await this.prisma.biometricDevice.findFirst({
      where: { tenantId, deviceId },
    });
    if (device) return device.id;

    const apiKey = createHash('sha256').update(`${deviceId}:${this.webhookSecret}`).digest('hex');
    const created = await this.prisma.biometricDevice.create({
      data: { tenantId, deviceId, name: `Hadirr ${deviceId}`, apiKeyHash: apiKey, isActive: true },
    });
    return created.id;
  }

  private verifySignature(payload: HadirrWebhookPayload, signature: string): boolean {
    const body = JSON.stringify(payload);
    const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  }
}
