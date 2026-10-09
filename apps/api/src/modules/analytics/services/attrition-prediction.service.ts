import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export interface AttritionPrediction {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: Array<{ factor: string; impact: number; description: string }>;
  recommendation: string;
}

interface EmployeeFeatures {
  lateFrequency: number;
  absentFrequency: number;
  overtimeHours: number;
  leaveBalance: number;
  tenureMonths: number;
  performanceScore: number;
  engagementScore: number;
  salaryCompetitiveness: number;
  hasDisciplinaryCase: boolean;
}

const WEIGHTS = {
  lateFrequency: 0.15,
  absentFrequency: 0.20,
  overtimeHours: 0.10,
  leaveBalance: 0.05,
  tenureMonths: 0.10,
  performanceScore: 0.15,
  engagementScore: 0.15,
  salaryCompetitiveness: 0.05,
  hasDisciplinaryCase: 0.03,
};

@Injectable()
export class AttritionPredictionService {
  constructor(private readonly prisma: PrismaService) {}

  async predictBatch(tenantId: string, limit = 50): Promise<AttritionPrediction[]> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: {
          where: { date: { gte: new Date(Date.now() - 90 * 86400000) } },
          select: { status: true, lateMinutes: true, overtimeMinutes: true },
        },
        leaveBalances: { where: { year: new Date().getFullYear() } },
        employments: { where: { isActive: true }, include: { grade: true }, take: 1 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' } },
      },
      take: limit,
    });

    const predictions: AttritionPrediction[] = [];
    for (const emp of employees) {
      const features = this.extractFeatures(emp);
      const score = this.calculateRiskScore(features);
      const factors = this.identifyFactors(features);
      const level = this.classifyRisk(score);
      const recommendation = this.generateRecommendation(factors, level);

      predictions.push({
        employeeId: emp.id,
        employeeName: emp.fullName,
        riskScore: Math.round(score * 100) / 100,
        riskLevel: level,
        factors,
        recommendation,
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  async predictSingle(tenantId: string, employeeId: string): Promise<AttritionPrediction | null> {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: {
          where: { date: { gte: new Date(Date.now() - 90 * 86400000) } },
          select: { status: true, lateMinutes: true, overtimeMinutes: true },
        },
        leaveBalances: { where: { year: new Date().getFullYear() } },
        employments: { where: { isActive: true }, include: { grade: true }, take: 1 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' } },
      },
    });
    if (!emp) return null;

    const features = this.extractFeatures(emp);
    const score = this.calculateRiskScore(features);
    const factors = this.identifyFactors(features);
    const level = this.classifyRisk(score);
    const recommendation = this.generateRecommendation(factors, level);

    return {
      employeeId: emp.id,
      employeeName: emp.fullName,
      riskScore: Math.round(score * 100) / 100,
      riskLevel: level,
      factors,
      recommendation,
    };
  }

  private extractFeatures(emp: any): EmployeeFeatures {
    const attendances = emp.attendanceRecords ?? [];
    const lateCount = attendances.filter((a: any) => a.status === 'LATE').length;
    const absentCount = attendances.filter((a: any) => a.status === 'ABSENT').length;
    const overtimeMinutes = attendances.reduce((s: number, a: any) => s + (a.overtimeMinutes ?? 0), 0);

    const leaveBalances = emp.leaveBalances ?? [];
    const totalLeaveDays = leaveBalances.reduce(
      (s: number, b: any) =>
        s + (b.totalEntitled ?? 0) + (b.carryForward ?? 0) - (b.totalUsed ?? 0) - (b.totalPending ?? 0) - (b.debtCarry ?? 0),
      0,
    );

    const tenureMonths = emp.employments?.[0]?.startDate
      ? Math.max(0, (Date.now() - new Date(emp.employments[0].startDate).getTime()) / (30 * 86400000))
      : 0;

    const performanceScore = emp.performanceReviews?.[0]?.overallScore ?? 3;
    const engagementScore = 3; // Default neutral engagement score

    const gradeBase = Number(emp.employments?.[0]?.grade?.baseSalary ?? 0);
    const salaryCompetitiveness = gradeBase > 0 ? Math.min(1, gradeBase / 10_000_000) : 0.5;

    return {
      lateFrequency: lateCount / Math.max(attendances.length, 1),
      absentFrequency: absentCount / Math.max(attendances.length, 1),
      overtimeHours: overtimeMinutes / 60,
      leaveBalance: totalLeaveDays,
      tenureMonths,
      performanceScore: performanceScore / 5,
      engagementScore: engagementScore / 5,
      salaryCompetitiveness,
      hasDisciplinaryCase: (emp.disciplinaryCases?.length ?? 0) > 0,
    };
  }

  private calculateRiskScore(f: EmployeeFeatures): number {
    let score = 0;
    score += f.lateFrequency * WEIGHTS.lateFrequency;
    score += f.absentFrequency * WEIGHTS.absentFrequency;
    score += Math.min(f.overtimeHours / 100, 1) * WEIGHTS.overtimeHours;
    score += Math.max(0, (10 - f.leaveBalance) / 10) * WEIGHTS.leaveBalance;
    score += Math.max(0, (12 - f.tenureMonths) / 12) * WEIGHTS.tenureMonths;
    score += (1 - f.performanceScore) * WEIGHTS.performanceScore;
    score += (1 - f.engagementScore) * WEIGHTS.engagementScore;
    score += (1 - f.salaryCompetitiveness) * WEIGHTS.salaryCompetitiveness;
    score += (f.hasDisciplinaryCase ? 1 : 0) * WEIGHTS.hasDisciplinaryCase;
    return Math.min(score, 1);
  }

  private identifyFactors(f: EmployeeFeatures): Array<{ factor: string; impact: number; description: string }> {
    const factors: Array<{ factor: string; impact: number; description: string }> = [];

    if (f.lateFrequency > 0.2) {
      factors.push({ factor: 'Keterlambatan', impact: f.lateFrequency * WEIGHTS.lateFrequency, description: `${(f.lateFrequency * 100).toFixed(0)}% hari terlambat` });
    }
    if (f.absentFrequency > 0.1) {
      factors.push({ factor: 'Ketidakhadiran', impact: f.absentFrequency * WEIGHTS.absentFrequency, description: `${(f.absentFrequency * 100).toFixed(0)}% hari absen` });
    }
    if (f.overtimeHours > 50) {
      factors.push({ factor: 'Lembur Berlebih', impact: Math.min(f.overtimeHours / 100, 1) * WEIGHTS.overtimeHours, description: `${f.overtimeHours.toFixed(0)} jam lembur 90 hari` });
    }
    if (f.performanceScore < 0.6) {
      factors.push({ factor: 'Performa Rendah', impact: (1 - f.performanceScore) * WEIGHTS.performanceScore, description: `Skor ${(f.performanceScore * 5).toFixed(1)}/5` });
    }
    if (f.engagementScore < 0.6) {
      factors.push({ factor: 'Engagement Rendah', impact: (1 - f.engagementScore) * WEIGHTS.engagementScore, description: `Skor ${(f.engagementScore * 5).toFixed(1)}/5` });
    }
    if (f.tenureMonths < 6) {
      factors.push({ factor: 'Masa Kerja Pendek', impact: Math.max(0, (12 - f.tenureMonths) / 12) * WEIGHTS.tenureMonths, description: `${f.tenureMonths.toFixed(0)} bulan` });
    }
    if (f.hasDisciplinaryCase) {
      factors.push({ factor: 'Kasus Disiplin', impact: WEIGHTS.hasDisciplinaryCase, description: 'Kasus disiplin terbuka' });
    }

    return factors.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  private classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 0.5) return 'CRITICAL';
    if (score >= 0.3) return 'HIGH';
    if (score >= 0.15) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendation(factors: Array<{ factor: string; description: string }>, level: string): string {
    if (level === 'CRITICAL') {
      const topFactors = factors.slice(0, 2).map((f) => f.factor).join(' & ');
      return `Intervensi segera: ${topFactors}. Jadwalkan 1-on-1 dengan HR & manajer.`;
    }
    if (level === 'HIGH') {
      const topFactors = factors.slice(0, 2).map((f) => f.factor).join(' & ');
      return `Perlu perhatian: ${topFactors}. Tinjau beban kerja & engagement.`;
    }
    if (level === 'MEDIUM') {
      return 'Pantau trends. Pastikan workload & kompensasi kompetitif.';
    }
    return 'Risiko rendah. Pertahankan engagement & development.';
  }
}
