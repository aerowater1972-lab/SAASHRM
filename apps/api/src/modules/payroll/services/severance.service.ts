import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { CreateSeveranceDto } from '../dto/severance.dto';
import { calendarMonthsBetween, computeWageBase } from '@modules/shared/utils/wage-base.util';

/**
 * Pesangon & kompensasi akhir hubungan kerja (PP 35/2021).
 *
 * - UP (pesangon): 1 bln (<1 thn), 2 (1-2 thn) ... 9 bln (>= 8 thn).
 * - UPMK: 0 (<3 thn), 2 (3-6), 3 (6-9), 4 (9-12), 5 (12-15), 6 (15-18),
 *   7 (18-21), 8 (21-24), 10 (>= 24 thn).
 * - UPH: 15% x (UP + UPMK).
 * - Pengali per sebab (wajib review biro hukum untuk kasus sengketa):
 *   RESIGNATION 0/0/UPH+pisah; TERMINATION 1/1/UPH; EFFICIENCY 0,5/1/UPH;
 *   RETIREMENT 1,75/1/UPH; DEATH 2/1/UPH; MISCONDUCT 0/0/UPH+pisah;
 *   ILLNESS 2/1/UPH; CONTRACT_END = kompensasi PKWT (bln/12 x upah).
 *
 * SENGAJA tidak menerbitkan adjustment payroll otomatis: pesangon dibayar
 * off-cycle; tandai PAID manual setelah pembayaran. Integrasi ke
 * FinalSettlement modul Resignation dicatat sebagai lanjutan.
 */
const CAUSE_MULTIPLIERS: Record<string, { up: number; upmk: number; uph: boolean }> = {
  RESIGNATION: { up: 0, upmk: 0, uph: true },
  TERMINATION: { up: 1, upmk: 1, uph: true },
  EFFICIENCY: { up: 0.5, upmk: 1, uph: true },
  RETIREMENT: { up: 1.75, upmk: 1, uph: true },
  DEATH: { up: 2, upmk: 1, uph: true },
  MISCONDUCT: { up: 0, upmk: 0, uph: true },
  ILLNESS: { up: 2, upmk: 1, uph: true },
};

export const SEVERANCE_CAUSES = [...Object.keys(CAUSE_MULTIPLIERS), 'CONTRACT_END'];

/**
 * PPh 21 final atas uang pesangon/UPMK/UPH (PP 68/2009):
 * - 0% untuk bruto s.d. Rp50jt
 * - 5% untuk Rp50-100jt
 * - 15% untuk Rp100-500jt
 * - 25% di atas Rp500jt
 * Uang pisah (pisahAmount, sesuai PKB/kontrak) BUKAN objek pajak pesangon
 * bila dibayar terpisah dari program pesangon — dihitung terpisah di sini
 * hanya bila `includePisah=true` diminta eksplisit.
 */
export function calculateSeveranceTax(bruto: number): { brackets: Array<{ upTo: number; rate: number; taxable: number; tax: number }>; total: number } {
  const brackets = [
    { upTo: 50_000_000, rate: 0 },
    { upTo: 100_000_000, rate: 0.05 },
    { upTo: 500_000_000, rate: 0.15 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.25 },
  ];
  let prev = 0;
  let total = 0;
  const detail = [];
  for (const b of brackets) {
    if (bruto <= prev) break;
    const taxable = Math.min(bruto, b.upTo) - prev;
    const tax = Math.round(taxable * b.rate);
    total += tax;
    detail.push({ upTo: b.upTo, rate: b.rate, taxable, tax });
    prev = b.upTo;
  }
  return { brackets: detail, total };
}

@Injectable()
export class SeveranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  upMonths(completedYears: number): number {
    if (completedYears >= 8) return 9;
    if (completedYears >= 7) return 8;
    if (completedYears >= 6) return 7;
    if (completedYears >= 5) return 6;
    if (completedYears >= 4) return 5;
    if (completedYears >= 3) return 4;
    if (completedYears >= 2) return 3;
    if (completedYears >= 1) return 2;
    return 1;
  }

  upmkMonths(completedYears: number): number {
    if (completedYears >= 24) return 10;
    if (completedYears >= 21) return 8;
    if (completedYears >= 18) return 7;
    if (completedYears >= 15) return 6;
    if (completedYears >= 12) return 5;
    if (completedYears >= 9) return 4;
    if (completedYears >= 6) return 3;
    if (completedYears >= 3) return 2;
    return 0;
  }

  async createCase(tenantId: string, dto: CreateSeveranceDto, userId?: string) {
    if (!SEVERANCE_CAUSES.includes(dto.cause)) {
      throw new BadRequestException(`Sebab tidak dikenal: ${dto.cause}`);
    }
    const employee: any = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const terminationDate = new Date(dto.terminationDate);
    const startDate = employee.startDate ? new Date(employee.startDate) : null;
    if (!startDate || Number.isNaN(+startDate)) {
      throw new BadRequestException('Karyawan tidak punya startDate untuk hitung masa kerja');
    }
    if (terminationDate < startDate) {
      throw new BadRequestException('terminationDate tidak boleh sebelum startDate');
    }

    const tenureMonths = calendarMonthsBetween(startDate, terminationDate);
    const wageBase = await computeWageBase(this.prisma, tenantId, employee);
    const pisah = Math.max(0, Number(dto.pisahAmount || 0));

    let up = 0;
    let upmk = 0;
    let uph = 0;
    if (dto.cause === 'CONTRACT_END') {
      // Kompensasi PKWT: proporsional bulan/12 x upah (termasuk kontrak 5 tahun = 5 bln upah).
      // Catatan pajak: kompensasi PKWT BUKAN objek PPh final pesangon (PP 68/2009)
      // — dipajaki sebagai penghasilan biasa (TER/progresif) saat dibayarkan.
      const compensation = Math.round((wageBase * tenureMonths) / 12);
      const total = compensation + pisah;
      return this.prisma.severanceCase.create({
        data: {
          tenantId, employeeId: dto.employeeId, cause: dto.cause, terminationDate,
          tenureMonths, wageBase, upAmount: 0, upmkAmount: 0, uphAmount: 0,
          pisahAmount: pisah, totalAmount: total, notes: dto.notes, decidedBy: userId,
        } as any,
      });
    }

    const mult = CAUSE_MULTIPLIERS[dto.cause];
    const years = Math.floor(tenureMonths / 12);
    up = Math.round(mult.up * this.upMonths(years) * wageBase);
    upmk = Math.round(mult.upmk * this.upmkMonths(years) * wageBase);
    uph = mult.uph ? Math.round(0.15 * (up + upmk)) : 0;
    const total = up + upmk + uph + pisah;

    const created: any = await this.prisma.severanceCase.create({
      data: {
        tenantId, employeeId: dto.employeeId, cause: dto.cause, terminationDate,
        tenureMonths, wageBase, upAmount: up, upmkAmount: upmk, uphAmount: uph,
        pisahAmount: pisah, totalAmount: total, notes: dto.notes, decidedBy: userId,
      } as any,
    });

    // Objek PPh final = UP+UPMK+UPH (tanpa uang pisah). Disertakan agar
    // Finance langsung tahu neto yang dibayarkan ke karyawan.
    const tax = calculateSeveranceTax(up + upmk + uph);
    return { ...created, incomeTax: tax.total, incomeTaxBrackets: tax.brackets, netPayout: total - tax.total };
  }

  async findAll(tenantId: string, employeeId?: string) {
    return this.prisma.severanceCase.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const row = await this.prisma.severanceCase.findFirst({
      where: { id, tenantId },
      include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
    });
    if (!row) throw new NotFoundException(`Severance case ${id} not found`);
    return row;
  }

  async approve(tenantId: string, id: string, userId?: string) {
    const row = await this.findOne(tenantId, id);
    if ((row as any).status !== 'DRAFT') {
      throw new BadRequestException(`Hanya DRAFT yang bisa disetujui (status: ${(row as any).status})`);
    }
    return this.prisma.severanceCase.update({
      where: { id },
      data: { status: 'APPROVED', decidedBy: userId, decidedAt: new Date() } as any,
    });
  }

  async markPaid(tenantId: string, id: string) {
    const row = await this.findOne(tenantId, id);
    if ((row as any).status !== 'APPROVED') {
      throw new BadRequestException(`Hanya APPROVED yang bisa ditandai dibayar (status: ${(row as any).status})`);
    }
    return this.prisma.severanceCase.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() } as any,
    });
  }

  async cancel(tenantId: string, id: string) {
    const row = await this.findOne(tenantId, id);
    if ((row as any).status !== 'DRAFT') {
      throw new BadRequestException(`Hanya DRAFT yang bisa dibatalkan (status: ${(row as any).status})`);
    }
    return this.prisma.severanceCase.update({ where: { id }, data: { status: 'CANCELLED' } as any });
  }
}
