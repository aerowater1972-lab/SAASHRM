import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Kode jenis cuti sakit per tenant seed: 'SL' (default) vs 'CS' (demo
 * Nusantara). Semua logika sakit (skema upah, Bradford, potongan) wajib
 * memakai daftar ini, bukan hardcode satu kode.
 */
export const SICK_LEAVE_CODES = ['SL', 'CS'];

/**
 * Kode cuti tahunan per tenant seed: 'AL' (default) vs 'CT' (demo Nusantara,
 * "Cuti Tahunan"). Berlaku untuk akrual tahunan & potongan cuti bersama.
 */
export const ANNUAL_LEAVE_CODES = ['AL', 'CT'];

/** Bulan kalender penuh antara dua tanggal (start inklusif). */
export function calendarMonthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Upah acuan = gaji pokok (grade level x Rp1jt) + tunjangan TETAP aktif
 * (FIXED). Satu definisi bersama untuk THR, pesangon, dan kepatuhan UMK
 * agar tidak divergen antar modul finansial.
 */
export async function computeWageBase(
  prisma: PrismaService,
  tenantId: string,
  employee: { employments?: Array<{ grade?: { level?: number } | null }> | null },
): Promise<number> {
  const baseSalary = Number(employee?.employments?.[0]?.grade?.level || 0) * 1000000 || 0;
  const fixed: Array<{ defaultValue?: unknown; value?: unknown }> = await (
    prisma as any
  ).payrollComponent.findMany({
      where: {
        tenantId,
        isActive: true,
        calculationMethod: 'FIXED',
        type: { in: ['EARNING', 'ALLOWANCE'] },
      },
    });
  const allowances = fixed.reduce((s, c) => s + Number(c.defaultValue ?? c.value ?? 0), 0);
  return baseSalary + allowances;
}
