import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Annual regulatory rollover (runs Jan 1, 05:00).
 *
 * BpjsConfig / TaxConfig / ProvincialMinimumWage are effective-dated per
 * tenant. When a new calendar year starts and no config exists for that
 * year, the latest effective row is cloned forward so payroll keeps
 * calculating with last-known-good rates instead of silently falling back
 * to hardcoded service constants.
 *
 * Cloned UMK/UMP rows are flagged `CARRY_FORWARD_PENDING_REVIEW` because
 * governor decrees (UMP) are only published Nov-Dec — HR must update the
 * actual figure when the decree is out.
 */
@Injectable()
export class RegulatorySyncService {
  private readonly logger = new Logger(RegulatorySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 5 1 1 *')
  async handleYearlyRollover(): Promise<void> {
    const year = new Date().getFullYear();
    const summary = await this.syncYear(year);
    this.logger.log(
      `Regulatory rollover ${year}: ${summary.bpjsCloned} BPJS, ${summary.taxCloned} tax, ${summary.umpCloned} UMK rows cloned across ${summary.tenants} tenant(s)`,
    );
  }

  async syncYear(year: number): Promise<{
    tenants: number;
    bpjsCloned: number;
    taxCloned: number;
    umpCloned: number;
  }> {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const effectiveDate = new Date(year, 0, 1);

    let bpjsCloned = 0;
    let taxCloned = 0;
    let umpCloned = 0;

    for (const { id: tenantId } of tenants) {
      bpjsCloned += await this.rolloverBpjs(tenantId, year, effectiveDate);
      taxCloned += await this.rolloverTax(tenantId, year, effectiveDate);
      umpCloned += await this.rolloverUmp(tenantId, year, effectiveDate);
    }

    return { tenants: tenants.length, bpjsCloned, taxCloned, umpCloned };
  }

  private async rolloverBpjs(
    tenantId: string,
    year: number,
    effectiveDate: Date,
  ): Promise<number> {
    const rows = await this.prisma.bpjsConfig.findMany({
      where: { tenantId, status: 'ACTIVE' },
    });
    const latestByType = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const cur = latestByType.get(row.type);
      if (!cur || new Date(row.effectiveDate) > new Date(cur.effectiveDate)) {
        latestByType.set(row.type, row);
      }
    }
    let cloned = 0;
    for (const row of latestByType.values()) {
      if (new Date(row.effectiveDate).getFullYear() >= year) continue;
      const { id, createdAt, updatedAt, ...rest } = row as Record<string, unknown>;
      void id;
      void createdAt;
      void updatedAt;
      await this.prisma.bpjsConfig.create({
        data: { ...rest, tenantId, effectiveDate } as never,
      });
      cloned += 1;
    }
    return cloned;
  }

  private async rolloverTax(
    tenantId: string,
    year: number,
    effectiveDate: Date,
  ): Promise<number> {
    const rows = await this.prisma.taxConfig.findMany({
      where: { tenantId, status: 'ACTIVE' },
    });
    const latestByMethod = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const cur = latestByMethod.get(row.taxMethod);
      if (!cur || new Date(row.effectiveDate) > new Date(cur.effectiveDate)) {
        latestByMethod.set(row.taxMethod, row);
      }
    }
    let cloned = 0;
    for (const row of latestByMethod.values()) {
      if (new Date(row.effectiveDate).getFullYear() >= year) continue;
      const { id, createdAt, updatedAt, ...rest } = row as Record<string, unknown>;
      void id;
      void createdAt;
      void updatedAt;
      await this.prisma.taxConfig.create({
        data: { ...rest, tenantId, effectiveDate } as never,
      });
      cloned += 1;
    }
    return cloned;
  }

  private async rolloverUmp(
    tenantId: string,
    year: number,
    effectiveDate: Date,
  ): Promise<number> {
    const rows = await this.prisma.provincialMinimumWage.findMany({
      where: { tenantId },
    });
    const latestByProvince = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const cur = latestByProvince.get(row.province);
      if (!cur || row.year > cur.year) {
        latestByProvince.set(row.province, row);
      }
    }
    let cloned = 0;
    for (const row of latestByProvince.values()) {
      if (row.year >= year) continue;
      const { id, createdAt, updatedAt, ...rest } = row as Record<string, unknown>;
      void id;
      void createdAt;
      void updatedAt;
      await this.prisma.provincialMinimumWage.create({
        data: {
          ...rest,
          tenantId,
          year,
          effectiveDate,
          source: 'CARRY_FORWARD_PENDING_REVIEW',
        } as never,
      });
      cloned += 1;
    }
    return cloned;
  }
}
