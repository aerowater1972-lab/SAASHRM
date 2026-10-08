import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { computeWageBase } from '@modules/shared/utils/wage-base.util';
import { CreateWageDto, UpdateWageDto } from '../dto/provincial-wage.dto';

@Injectable()
export class ProvincialWageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { province?: string; year?: number }) {
    const where: any = { tenantId };
    if (filters.province) {
      where.province = { contains: filters.province, mode: 'insensitive' };
    }
    if (filters.year) {
      where.year = filters.year;
    }
    return this.prisma.provincialMinimumWage.findMany({ where, orderBy: [{ province: 'asc' }, { year: 'desc' }] });
  }

  async findById(tenantId: string, id: string) {
    const wage = await this.prisma.provincialMinimumWage.findFirst({ where: { id, tenantId } });
    if (!wage) throw new NotFoundException('Wage entry not found');
    return wage;
  }

  async create(tenantId: string, dto: CreateWageDto) {
    try {
      return await this.prisma.provincialMinimumWage.create({
        data: {
          tenantId,
          province: dto.province,
          year: dto.year,
          minimumWage: dto.amount,
          effectiveDate: new Date(new Date().getFullYear(), 0, 1),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Wage entry for this province/year already exists');
      }
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateWageDto) {
    const existing = await this.prisma.provincialMinimumWage.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Wage entry not found');
    return this.prisma.provincialMinimumWage.update({ where: { id }, data: { minimumWage: dto.amount } });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.provincialMinimumWage.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Wage entry not found');
    await this.prisma.provincialMinimumWage.delete({ where: { id } });
    return { deleted: true };
  }

  async calculateMinimumWage(tenantId: string, employeeId: string, periodYear?: number) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { province: true, city: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const year = periodYear ?? new Date().getFullYear();
    const province = employee.province;
    if (!province) return null;

    const wageEntry = await this.prisma.provincialMinimumWage.findFirst({
      where: { tenantId, province, year },
    });

    return {
      employeeId,
      province,
      year,
      minimumWage: wageEntry?.minimumWage ?? null,
      hasProvincialWage: !!wageEntry,
    };
  }

  async lookup(tenantId: string, province: string, year: number) {
    const wage = await this.prisma.provincialMinimumWage.findFirst({
      where: { tenantId, province, year },
    });
    if (!wage) throw new NotFoundException(`No wage entry for ${province} in ${year}`);
    return wage;
  }

  async getStats(tenantId: string, year?: number) {
    const where: any = { tenantId };
    if (year) {
      where.year = year;
    }
    const entries = await this.prisma.provincialMinimumWage.findMany({ where });
    const provinces = entries.map((e) => e.province);
    const uniqueProvinces = [...new Set(provinces)];
    const avgWage = entries.length > 0 ? entries.reduce((sum, e) => sum + Number(e.minimumWage), 0) / entries.length : 0;
    return {
      totalEntries: entries.length,
      uniqueProvinces: uniqueProvinces.length,
      averageWage: Math.round(avgWage),
      yearRange: {
        min: entries.length > 0 ? Math.min(...entries.map((e) => e.year)) : null,
        max: entries.length > 0 ? Math.max(...entries.map((e) => e.year)) : null,
      },
    };
  }

  /**
   * Kepatuhan UMK (PP 36/2021): bandingkan upah (pokok + tunjangan tetap)
   * tiap karyawan aktif dengan upah minimum provinsi domisilinya.
   * Non-blokir: mengembalikan daftar di bawah minimum + yang tak bisa
   * dinilai (tanpa provinsi / tanpa entri upah).
   */
  async checkCompliance(tenantId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' as any },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        province: true,
        employments: { where: { isActive: true }, select: { grade: { select: { level: true } } } },
      },
    });

    const below: Array<Record<string, unknown>> = [];
    const unknown: Array<Record<string, unknown>> = [];
    let compliant = 0;

    for (const emp of employees) {
      const wage = await computeWageBase(this.prisma, tenantId, emp as any);
      if (!emp.province) {
        unknown.push({ employeeId: emp.id, reason: 'NO_PROVINCE' });
        continue;
      }
      const entry = await this.prisma.provincialMinimumWage.findFirst({
        where: { tenantId, province: emp.province, year: targetYear },
      });
      if (!entry) {
        unknown.push({ employeeId: emp.id, reason: 'NO_WAGE_ENTRY', province: emp.province });
        continue;
      }
      const minimum = Number(entry.minimumWage);
      if (wage >= minimum) {
        compliant++;
      } else {
        below.push({
          employeeId: emp.id,
          employeeCode: (emp as any).employeeId,
          fullName: (emp as any).fullName,
          province: emp.province,
          wage,
          minimumWage: minimum,
          shortfall: minimum - wage,
        });
      }
    }

    return {
      year: targetYear,
      checked: employees.length,
      compliant,
      belowCount: below.length,
      unknownCount: unknown.length,
      below,
      unknown,
    };
  }
}