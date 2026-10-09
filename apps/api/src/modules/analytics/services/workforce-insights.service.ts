import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export interface InsightSignal {
  key: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  count: number;
  items: Array<Record<string, unknown>>;
  action?: string;
}

/**
 * Sinyal proaktif berbasis aturan (bukan ML): tren keterlambatan/absensi,
 * kontrak & probation berakhir, liabilitas cuti, backlog spoof, ringkasan
 * headcount. Setiap sinyal dapat dijelaskan (explainable) — ambang dan
 * pembanding selalu disertakan di `detail`.
 */
@Injectable()
export class WorkforceInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(tenantId: string): Promise<{ generatedAt: string; signals: InsightSignal[] }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const signals: InsightSignal[] = [];

    // 1-2. Tren keterlambatan & absensi (bulan berjalan vs bulan lalu).
    const [lateThis, latePrev, absentThis, absentPrev] = await Promise.all([
      this.countByStatus(tenantId, 'LATE', monthStart, now),
      this.countByStatus(tenantId, 'LATE', prevStart, monthStart),
      this.countByStatus(tenantId, 'ABSENT', monthStart, now),
      this.countByStatus(tenantId, 'ABSENT', prevStart, monthStart),
    ]);
    const spike = (cur: number, prev: number) => prev === 0 ? (cur >= 5 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    const lateDelta = spike(lateThis, latePrev);
    if (lateDelta >= 50 && lateThis >= 5) {
      signals.push({
        key: 'late_spike',
        severity: lateDelta >= 100 ? 'critical' : 'warning',
        title: 'Lonjakan keterlambatan',
        detail: `${lateThis} keterlambatan bulan ini vs ${latePrev} bulan lalu (+${lateDelta}%).`,
        count: lateThis,
        items: await this.topLateEmployees(tenantId, monthStart, now),
        action: 'Tinjau pola shift dan kirim pengingat via WhatsApp.',
      });
    }
    const absentDelta = spike(absentThis, absentPrev);
    if (absentDelta >= 50 && absentThis >= 5) {
      signals.push({
        key: 'absent_rise',
        severity: absentDelta >= 100 ? 'critical' : 'warning',
        title: 'Kenaikan ketidakhadiran',
        detail: `${absentThis} hari absen bulan ini vs ${absentPrev} bulan lalu (+${absentDelta}%).`,
        count: absentThis,
        items: [],
        action: 'Cek tren per departemen di HR analytics.',
      });
    }

    // 3. Kontrak berakhir <= 60 hari.
    const contractLimit = new Date(now.getTime() + 60 * 86400000);
    const expiring = await (this.prisma as any).employment.findMany({
      where: {
        isActive: true,
        type: { in: ['CONTRACT', 'FREELANCE', 'INTERNSHIP'] },
        endDate: { gte: now, lte: contractLimit },
        employee: { tenantId },
      },
      include: { employee: { select: { id: true, fullName: true } } },
      take: 10,
    });
    const expiringTotal: number = await (this.prisma as any).employment.count({
      where: {
        isActive: true,
        type: { in: ['CONTRACT', 'FREELANCE', 'INTERNSHIP'] },
        endDate: { gte: now, lte: contractLimit },
        employee: { tenantId },
      },
    });
    if (expiringTotal > 0) {
      signals.push({
        key: 'contracts_expiring',
        severity: 'warning',
        title: 'Kontrak segera berakhir',
        detail: `${expiringTotal} kontrak berakhir dalam 60 hari. Siapkan perpanjangan/PKWT baru.`,
        count: expiringTotal,
        items: expiring.map((e: any) => ({
          name: e.employee?.fullName, type: e.type,
          endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 10) : null,
        })),
        action: 'Buka modul rekrutmen/kontrak untuk perpanjangan.',
      });
    }

    // 4. Probation perlu review (tipe PROBATION atau join < 90 hari).
    const probationCutoff = new Date(now.getTime() - 90 * 86400000);
    const probations = await (this.prisma as any).employee.findMany({
      where: {
        tenantId,
        joinDate: { gte: probationCutoff },
        terminationDate: null,
      },
      select: { id: true, fullName: true, joinDate: true },
      take: 10,
    });
    const probationTotal: number = await (this.prisma as any).employee.count({
      where: { tenantId, joinDate: { gte: probationCutoff }, terminationDate: null },
    });
    if (probationTotal > 0) {
      signals.push({
        key: 'probation_review',
        severity: 'info',
        title: 'Review masa probation',
        detail: `${probationTotal} karyawan bergabung < 90 hari. Jadwalkan evaluasi pengangkatan.`,
        count: probationTotal,
        items: probations.map((e: any) => ({
          name: e.fullName,
          joinDate: e.joinDate ? new Date(e.joinDate).toISOString().slice(0, 10) : null,
        })),
      });
    }

    // 5. Liabilitas cuti: saldo tersedia terbesar (risiko hangus/uang pengganti).
    const year = now.getFullYear();
    const balances = await (this.prisma as any).leaveBalance.findMany({
      where: { tenantId, year },
      include: { employee: { select: { fullName: true } }, leaveType: { select: { name: true } } },
    });
    const withAvail = balances
      .map((b: any) => ({
        name: b.employee?.fullName, type: b.leaveType?.name,
        available: Number(b.totalEntitled ?? 0) + Number(b.carryForward ?? 0)
          - Number(b.totalUsed ?? 0) - Number(b.totalPending ?? 0) - Number(b.debtCarry ?? 0),
      }))
      .filter((r: any) => r.available >= 10)
      .sort((a: any, b: any) => b.available - a.available)
      .slice(0, 5);
    if (withAvail.length > 0) {
      signals.push({
        key: 'leave_liability',
        severity: 'info',
        title: 'Saldo cuti menumpuk',
        detail: `${withAvail.length} karyawan menyimpan >= 10 hari cuti. Dorong perencanaan cuti.`,
        count: withAvail.length,
        items: withAvail,
      });
    }

    // 6. Backlog review spoof.
    const spoofTotal: number = await (this.prisma as any).attendanceRecord.count({
      where: { tenantId, isSuspicious: true, spoofReviewedBy: null },
    });
    if (spoofTotal > 0) {
      signals.push({
        key: 'spoof_backlog',
        severity: spoofTotal >= 10 ? 'critical' : 'warning',
        title: 'Antrean review anti-spoof',
        detail: `${spoofTotal} rekaman absensi mencurigakan belum direview.`,
        count: spoofTotal,
        items: [],
        action: 'Buka Attendance > Flagged untuk review.',
      });
    }

    // 7. Ringkasan headcount (selalu ada bila ada karyawan).
    const [active, hires30, exits30] = await Promise.all([
      (this.prisma as any).employee.count({ where: { tenantId, terminationDate: null } }),
      (this.prisma as any).employee.count({ where: { tenantId, joinDate: { gte: new Date(now.getTime() - 30 * 86400000) } } }),
      (this.prisma as any).employee.count({ where: { tenantId, terminationDate: { gte: new Date(now.getTime() - 30 * 86400000) } } }),
    ]);
    signals.push({
      key: 'headcount_summary',
      severity: 'info',
      title: 'Ringkasan headcount',
      detail: `${active} aktif; +${hires30} bergabung / -${exits30} keluar dalam 30 hari.`,
      count: active,
      items: [{ active, hires30, exits30 }],
    });

    const order = { critical: 0, warning: 1, info: 2 };
    signals.sort((a, b) => order[a.severity] - order[b.severity]);
    return { generatedAt: now.toISOString(), signals };
  }

  private async countByStatus(tenantId: string, status: string, from: Date, to: Date): Promise<number> {
    return (this.prisma as any).attendanceRecord.count({
      where: { tenantId, status: status as any, date: { gte: from, lt: to } },
    });
  }

  private async topLateEmployees(tenantId: string, from: Date, to: Date) {
    const rows: any[] = await (this.prisma as any).attendanceRecord.groupBy({
      by: ['employeeId'],
      where: { tenantId, status: 'LATE' as any, date: { gte: from, lt: to } },
      _count: { employeeId: true },
      orderBy: { _count: { employeeId: 'desc' } },
      take: 5,
    });
    const ids = rows.map((r) => r.employeeId);
    const emps: any[] = ids.length
      ? await (this.prisma as any).employee.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })
      : [];
    const names = new Map(emps.map((e) => [e.id, e.fullName]));
    return rows.map((r) => ({ name: names.get(r.employeeId) ?? r.employeeId, lateCount: r._count.employeeId }));
  }
}
