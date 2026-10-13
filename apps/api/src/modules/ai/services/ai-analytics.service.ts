import { Injectable, BadRequestException, NotFoundException, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AiIsolationForestService } from './ai-isolation-forest.service';

/**
 * AI Analytics - menutup porsi AI-03..AI-08 dari Epic 1.1 (gap AI & Predictive Analytics, 82 DD):
 * AI-03 disengagement signal, AI-04 promotion readiness, AI-06 explainability (SHAP-style),
 * AI-08 retraining + drift (PSI). Model ringan tanpa sklearn.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReadinessLevel = 'NOT_READY' | 'SOON' | 'READY' | 'PRIORITY';
export type DriftBand = 'none' | 'watch' | 'drift';

export interface DisengagementSignal {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: Array<{ factor: string; impact: number; description: string }>;
  recommendation: string;
  windowDays: number;
}

export interface PromotionReadiness {
  employeeId: string;
  employeeName: string;
  readinessScore: number;
  readinessLevel: ReadinessLevel;
  factors: Array<{ factor: string; impact: number; description: string }>;
  recommendation: string;
}

export interface ExplainContribution {
  factor: string;
  direction: 'increase' | 'decrease';
  contribution: number;
  description: string;
}

export interface DriftResult {
  feature: string;
  psi: number;
  band: DriftBand;
}

export interface RetrainResult {
  modelVersion: number;
  updatedAt: Date;
  processed: number;
  meanRisk: number;
  highRiskCount: number;
}

const W = {
  lateRate: 0.16, absentRate: 0.2, overtimeHours: 0.12, leaveBalance: 0.06,
  tenureMonths: 0.1, performanceScore: 0.14, engagementScore: 0.14,
  suspiciousRate: 0.06, hasDisciplinaryCase: 0.02,
};

const RISK_LEVELS: [number, RiskLevel][] = [[0.55, 'CRITICAL'], [0.35, 'HIGH'], [0.18, 'MEDIUM']];

export interface EmployeeFeatures {
  lateRate: number;
  absentRate: number;
  overtimeHours: number;
  leaveBalance: number;
  tenureMonths: number;
  performanceScore: number;
  engagementScore: number;
  suspiciousRate: number;
  hasDisciplinaryCase: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

@Injectable()
export class AIAnalyticsService {
  private readonly logger = new Logger(AIAnalyticsService.name);
  private modelVersion = 0;
  private modelAt = new Date();
  private readonly forest = new AiIsolationForestService();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notification?: NotificationService,
  ) {}

  private async featureVector(emp: any): Promise<number[]> {
    const f = await this.extractFeatures(emp);
    const row = f ?? {
      lateRate: 0, absentRate: 0, overtimeHours: 0, leaveBalance: 0,
      tenureMonths: 0, performanceScore: 0.6, engagementScore: 0.6,
      suspiciousRate: 0, hasDisciplinaryCase: false,
    };
    return this.toVector(row);
  }

  private toVector(f: EmployeeFeatures): number[] {
    return [
      f.lateRate, f.absentRate, f.overtimeHours, f.leaveBalance, f.tenureMonths,
      f.performanceScore, f.engagementScore, f.suspiciousRate, f.hasDisciplinaryCase ? 1 : 0,
    ];
  }

  private neutralRow(): number[] {
    return [0, 0, 0, 0, 0, 0.6, 0.6, 0, 0];
  }

  private extractFeatures(emp: any): Promise<EmployeeFeatures | null> {
    const approved = (emp.attendanceRecords ?? []).filter((a: any) => a.isApproved);
    if (approved.length === 0) return Promise.resolve(null);
    const lateCount = approved.filter((a: any) => a.status === 'LATE').length;
    const absentCount = approved.filter((a: any) => a.status === 'ABSENT').length;
    const overtimeMinutes = approved.reduce((s: number, a: any) => s + (a.overtimeMinutes ?? 0), 0);
    const overtimeHours = Math.min(overtimeMinutes / 60, 40);
    const leftBalances = (emp.leaveBalances ?? [])
      .map((lb: any) => Math.max(0, Number(lb.totalEntitled) - Number(lb.totalUsed) - Number(lb.totalPending)))
      .filter((v: number) => v > 0);
    const left = leftBalances.length > 0 ? Math.max(...leftBalances) : 0;
    const leaveBalance = Math.min(Math.max((10 - left) / 10, 0), 1);
    const empRecord = emp.employments?.[0];
    const months = empRecord?.startDate ? (Date.now() - new Date(empRecord.startDate).getTime()) / 30.44 / 86400000 : 0;
    const tenureMonths = Math.min(Math.max((12 - months) / 12, 0), 1);
    const latest = (emp.performanceReviews ?? [0]).pop();
    const performanceScore = latest?.overallScore ? Number(latest.overallScore) / 5 : 0.6;
    const engagementScore = this.engagementScore(emp.tenantId, emp.id);
    return engagementScore
      .then((score) => ({
        lateRate: lateCount / approved.length,
        absentRate: absentCount / approved.length,
        overtimeHours,
        leaveBalance,
        tenureMonths,
        performanceScore,
        engagementScore: score ?? 0.6,
        suspiciousRate: approved.filter((a: any) => a.isSuspicious).length / approved.length,
        hasDisciplinaryCase: (emp.disciplinaryCases?.length ?? 0) > 0,
      }))
      .catch(() => null);
  }

  private featureNames(): string[] {
    return ['Late Rate', 'Absent Rate', 'Overtime Hours', 'Leave Balance', 'Tenure (normalized)', 'Performance Score', 'Engagement Score', 'Suspicious Rate', 'Disciplinary Case'];
  }

  private engageDescription(name: string, value: number): string {
    switch (name) {
      case 'Late Rate': return '${(value * 100).toFixed(0)}% hari terlambat';
      case 'Absent Rate': return '${(value * 100).toFixed(0)}% hari absen';
      case 'Overtime Hours': return '${value.toFixed(0)} jam lembur 90d';
      case 'Leave Balance': return 'Sisa cuti ${Math.round((1 - value) * 10)} hari';
      case 'Tenure (normalized)': return 'Masa kerja ${Math.round((1 - value) * 12)} bulan';
      case 'Performance Score': return 'Skor performa ${(value * 5).toFixed(1)}/5';
      case 'Engagement Score': return 'Skor engagement ${(value * 5).toFixed(1)}/5';
      case 'Suspicious Rate': return '${(value * 100).toFixed(0)}% rekam anomali';
      default: return name;
    }
  }

  private async engagementScore(tenantId: string, employeeId: string): Promise<number | null> {
    const survey = await this.prisma.engagementSurvey.findFirst({
      where: { tenantId, type: 'PULSE', status: 'CLOSED' },
      orderBy: { endDate: 'desc' },
      take: 1,
      include: { responses: { select: { answerValue: true }, take: 30 } },
    }).catch(() => null);
    if (!survey?.responses?.length) return null;
    const vals = survey.responses.map((r: any) => parseInt(r.answerValue, 10)).filter((v: number) => Number.isFinite(v) && v >= 1 && v <= 5);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length / 5;
  }

  async predictDisengagement(
    tenantId: string,
    limit = 20,
  ): Promise<DisengagementSignal[]> {
    if (limit < 1 || limit > 100) throw new BadRequestException('limit 1-100');
    const employees = await this.getDisengagementEmployees(tenantId, limit);
    const rows = await Promise.all(employees.map((e) => this.featureVector(e)));
    const scores = this.forest.score(rows);
    return employees.map((emp, i) => this.toSignal(emp, rows[i], scores[i]));
  }

  async predictDisengagementSingle(
    tenantId: string,
    employeeId: string,
  ): Promise<DisengagementSignal> {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: { where: { isApproved: true }, orderBy: { date: 'desc' }, take: 120 },
        leaveBalances: { where: { year: CURRENT_YEAR }, orderBy: { id: 'desc' }, take: 5 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' }, take: 5 },
        employments: { where: { isActive: true }, take: 1 },
      },
    });
    if (!emp) throw new NotFoundException('Karyawan ' + employeeId + ' tidak ditemukan');
    const row = await this.featureVector(emp);
    const scores = this.forest.score([row]);
    return this.toSignal(emp, row, scores[0]);
  }

  async predictPromotionReadiness(
    tenantId: string,
    limit = 20,
  ): Promise<PromotionReadiness[]> {
    if (limit < 1 || limit > 100) throw new BadRequestException('limit 1-100');
    const employees = await this.getDisengagementEmployees(tenantId, limit);
    return Promise.all(employees.map((emp) => this.toReadiness(emp)));
  }

  async predictPromotionReadinessSingle(
    tenantId: string,
    employeeId: string,
  ): Promise<PromotionReadiness> {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, status: 'ACTIVE' },
      include: {
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' }, take: 5 },
        employments: { where: { isActive: true }, take: 1 },
      },
    });
    if (!emp) throw new NotFoundException('Karyawan ' + employeeId + ' tidak ditemukan');
    return this.toReadiness(emp);
  }

  async explainDisengagement(
    tenantId: string,
    employeeId: string,
  ): Promise<ExplainContribution[]> {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: { where: { isApproved: true }, orderBy: { date: 'desc' }, take: 120 },
        leaveBalances: { where: { year: CURRENT_YEAR }, orderBy: { id: 'desc' }, take: 5 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' }, take: 5 },
        employments: { where: { isActive: true }, take: 1 },
      },
    });
    if (!emp) throw new NotFoundException('Karyawan ' + employeeId + ' tidak ditemukan');
    const row = await this.featureVector(emp);
    const contributions: ExplainContribution[] = [];
    const add = (name: string, value: number, neutral: number, direction: 'increase' | 'decrease') => {
      const key = name as keyof typeof W;
      const impact = Math.abs(value - neutral) * W[key];
      if (impact < 0.005) return;
      contributions.push({ factor: name, direction, contribution: impact, description: this.engageDescription(name, value) });
    };
    add('Late Rate', row[0], 0, 'increase');
    add('Absent Rate', row[1], 0, 'increase');
    add('Overtime Hours', row[2], 0, 'increase');
    add('Leave Balance', row[3], 0, 'increase');
    add('Tenure (normalized)', row[4], 0, 'decrease');
    add('Performance Score', row[5], 0.6, 'decrease');
    add('Engagement Score', row[6], 0.6, 'decrease');
    add('Suspicious Rate', row[7], 0, 'increase');
    if (row[8] > 0) {
      contributions.push({ factor: 'Kasus Disiplin', direction: 'increase', contribution: W.hasDisciplinaryCase, description: 'Ada kasus APPROVED' });
    }
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5);
  }

  private toSignal(emp: any, row: number[], score: number): DisengagementSignal {
    const factors = this.identifyFactors(row);
    const level = this.classifyRisk(score);
    const recommendation = this.generateRecommendation(factors, level);
    return { employeeId: emp.id, employeeName: emp.fullName, riskScore: Math.round(score * 100) / 100, riskLevel: level, factors: factors.map((f) => ({ ...f })), recommendation, windowDays: 90 };
  }

  private async toReadiness(emp: any): Promise<PromotionReadiness> {
    const reviews = emp.performanceReviews ?? [];
    const last24 = reviews.filter((r: any) => new Date(r.createdAt) >= new Date(Date.now() - 24 * 30 * 86400000));
    const perf = reviews.length > 0 ? Number(reviews[0].overallScore ?? 3) / 5 : 0.6;
    const empRecord = emp.employments?.[0];
    const months = empRecord?.startDate ? (Date.now() - new Date(empRecord.startDate).getTime()) / 30.44 / 86400000 : 0;
    const tenure = Math.min(12, Math.max(0, months));
    const noDisciplinary = (emp.disciplinaryCases?.length ?? 0) === 0;
    const engagementScore = (await this.engagementScore(emp.tenantId, emp.id)) ?? 0.6;
    let score = 0;
    score += perf >= 0.8 ? 30 : perf >= 0.6 ? 15 : 0;
    score += tenure >= 24 ? 20 : tenure >= 12 ? 10 : 0;
    score += last24.length >= 2 ? 15 : 0;
    score += engagementScore >= 0.7 ? 15 : 0;
    score += noDisciplinary ? 10 : 0;
    const readiness = Math.min(1, score / 100);
    const factors: PromotionReadiness['factors'] = [];
    if (perf >= 0.8) factors.push({ factor: 'Performa Tinggi', impact: 30, description: 'Skor ' + (perf * 5).toFixed(1) + '/5' });
    else if (perf >= 0.6) factors.push({ factor: 'Performa Cukup', impact: 15, description: 'Skor ' + (perf * 5).toFixed(1) + '/5' });
    if (tenure >= 24) factors.push({ factor: 'Masa Kerja Panjang', impact: 20, description: Math.round(tenure) + ' bulan' });
    else if (tenure >= 12) factors.push({ factor: 'Masa Kerja Cukup', impact: 10, description: Math.round(tenure) + ' bulan' });
    if (last24.length >= 2) factors.push({ factor: 'Feedback Babaran', impact: 15, description: last24.length + ' ulasan 24 bulan' });
    if (engagementScore >= 0.7) factors.push({ factor: 'Engagement Tinggi', impact: 15, description: (engagementScore * 5).toFixed(1) + '/5' });
    if (noDisciplinary) factors.push({ factor: 'Tidak Ada Kasus Disiplin', impact: 10, description: 'Tidak ada kasus APPROVED' });
    const level: ReadinessLevel = readiness >= 0.8 ? 'PRIORITY' : readiness >= 0.65 ? 'READY' : readiness >= 0.45 ? 'SOON' : 'NOT_READY';
    const recommendation = level === 'PRIORITY'
      ? 'Prioritas promosi: siapkan jalur karier & tenur. '
      : level === 'READY'
        ? 'Ready dipromosikan: rakrja siap. '
        : level === 'SOON'
          ? 'Siap dalam 1-2 siklus: kokongi goal & pengembangan. '
          : 'Belum siap: lanjutkan pengembangan & target berikutnya.';
    return { employeeId: emp.id, employeeName: emp.fullName, readinessScore: Math.round(readiness * 100) / 100, readinessLevel: level, factors, recommendation };
  }

  private identifyFactors(row: number[]): Array<{ factor: string; impact: number; description: string }> {
    const factors: Array<{ factor: string; impact: number; description: string }> = [];
    if (row[0] > 0.2) factors.push({ factor: 'Keterlambatan', impact: row[0] * W.lateRate, description: (row[0] * 100).toFixed(0) + '% hari terlambat' });
    if (row[1] > 0.1) factors.push({ factor: 'Ketidakhadiran', impact: row[1] * W.absentRate, description: (row[1] * 100).toFixed(0) + '% hari absen' });
    if (row[2] > 40) factors.push({ factor: 'Lembur Berlebih', impact: row[2] / 40 * W.overtimeHours, description: row[2].toFixed(0) + ' jam lembur 90 hari' });
    if (row[3] > 0.5) factors.push({ factor: 'Cuti Menyusut', impact: row[3] * W.leaveBalance, description: 'Sisa cuti ' + Math.round((1 - row[3]) * 10) + ' hari' });
    if (row[4] < 0.5) factors.push({ factor: 'Masa Kerja Pendek', impact: row[4] * W.tenureMonths, description: Math.round((1 - row[4]) * 12) + ' bulan' });
    if (row[5] < 0.6) factors.push({ factor: 'Performa Rendah', impact: (1 - row[5]) * W.performanceScore, description: 'Skor ' + (row[5] * 5).toFixed(1) + '/5' });
    if (row[6] < 0.6) factors.push({ factor: 'Engagement Rendah', impact: (1 - row[6]) * W.engagementScore, description: 'Skor ' + (row[6] * 5).toFixed(1) + '/5' });
    if (row[7] > 0.1) factors.push({ factor: 'Anomali Rekaman', impact: row[7] * W.suspiciousRate, description: (row[7] * 100).toFixed(0) + '% rekam mencurigakan' });
    if (row[8] > 0) factors.push({ factor: 'Kasus Disiplin', impact: W.hasDisciplinaryCase, description: 'Ada kasus APPROVED' });
    return factors.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  private classifyRisk(score: number): RiskLevel {
    for (const [threshold, level] of RISK_LEVELS) {
      if (score >= threshold) return level;
    }
    return 'LOW';
  }

  private generateRecommendation(factors: Array<{ factor: string; description: string }>, level: RiskLevel): string {
    const top = factors.slice(0, 2).map((f) => f.factor).join(' & ');
    if (level === 'CRITICAL') return 'Intervensi segera: ' + top + '. Jadwalkan 1-on-1 HR & manajer mingguan.';
    if (level === 'HIGH') return 'Perhatian: ' + top + '. Tinjau beban kerja & pola kehadiran.';
    if (level === 'MEDIUM') return 'Pantau tren; pastikan workload & dukungan manajemen stabil.';
    return 'Risiko rendah. Pertahankan engagement & program pengembangan.';
  }

  async retrainJob(tenantId: string): Promise<RetrainResult> {
    const employees = await this.getDisengagementEmployees(tenantId, 5000);
    const rows = await Promise.all(employees.map((e) => this.featureVector(e)));
    if (rows.length === 0) {
      return { modelVersion: this.modelVersion, updatedAt: this.modelAt, processed: 0, meanRisk: 0, highRiskCount: 0 };
    }
    this.forest.reset(++this.modelVersion, rows);
    const scores = this.forest.score(rows);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const high = scores.filter((s) => s > 0.6).length;
    this.modelAt = new Date();
    return { modelVersion: this.modelVersion, updatedAt: this.modelAt, processed: employees.length, meanRisk: Math.round(mean * 100) / 100, highRiskCount: high };
  }

  /**
   * AI-07: notifikasi high-risk ke HR admin (idempoten 24 jam per karyawan).
   * Scan top-N sinyal disengagement, kirim ke user ber-role HR Admin /
   * System Administrator bila level HIGH/CRITICAL dan belum diingatkan hari ini.
   */
  async notifyHighRisk(tenantId: string, limit = 100, now: Date = new Date()): Promise<number> {
    const signals = await this.predictDisengagement(tenantId, Math.min(100, Math.max(1, limit)));
    const flagged = signals.filter((s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL');
    if (flagged.length === 0) return 0;
    const hrUsers = await this.prisma.user.findMany({
      where: {
        tenantId,
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: { permission: { module: 'ai', action: 'manage' } },
              },
            },
          },
        },
      },
      select: { id: true },
    }).catch(() => []);
    let sent = 0;
    for (const sig of flagged) {
      const key = `ai.high-risk.${sig.employeeId}`;
      for (const u of hrUsers as Array<{ id: string }>) {
        const recent = await this.prisma.notification.findFirst({
          where: { userId: u.id, templateKey: key, createdAt: { gte: new Date(now.getTime() - 86400000) } },
        }).catch(() => null);
        if (recent) continue;
        if (this.notification) {
          await this.notification.send({
            tenantId,
            userId: u.id,
            templateKey: key,
            title: `Risiko disengagement ${sig.riskLevel}: ${sig.employeeName}`,
            body: `Skor ${(sig.riskScore * 100).toFixed(0)}% — ${sig.recommendation}`,
            payload: { employeeId: sig.employeeId, riskScore: sig.riskScore, riskLevel: sig.riskLevel },
          });
        }
        sent += 1;
      }
    }
    this.logger.log(`AI high-risk alert: ${sent} notifikasi untuk ${flagged.length} karyawan`);
    return sent;
  }


  async checkDrift(tenantId: string, windowDays = 90): Promise<DriftResult[]> {
    const now = new Date();
    const aStart = new Date(now.getTime() - windowDays * 86400000);
    const bStart = new Date(aStart.getTime() - windowDays * 86400000);
    const rowsA = await this.featureVectorsWindow(tenantId, bStart, now);
    const rowsB = await this.featureVectorsWindow(tenantId, aStart, bStart);
    const names = this.featureNames();
    const results: DriftResult[] = [];
    for (let f = 0; f < names.length; f += 1) {
      const a = rowsA.map((r) => r[f]);
      const b = rowsB.map((r) => r[f]);
      const pa = this.bucketProportions(a);
      const pb = this.bucketProportions(b);
      const psi = this.psi(pa, pb);
      const band = psi >= 0.20 ? 'drift' : psi >= 0.10 ? 'watch' : 'none';
      results.push({ feature: names[f], psi: Math.round(psi * 1000) / 1000, band });
    }
    return results;
  }

  getModelVersion(): { version: number; updatedAt: Date } {
    return { version: this.modelVersion, updatedAt: this.modelAt };
  }

  private async getDisengagementEmployees(tenantId: string, limit: number): Promise<any[]> {
    return this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: { where: { isApproved: true }, orderBy: { date: 'desc' }, take: 120 },
        leaveBalances: { where: { year: CURRENT_YEAR }, orderBy: { id: 'desc' }, take: 5 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinaryCases: { where: { status: 'APPROVED' }, take: 5 },
        employments: { where: { isActive: true }, take: 1 },
      },
      take: limit,
    });
  }

  private async featureVectorsWindow(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<number[][]> {
    const empl = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: { where: { isApproved: true, date: { gte: from, lte: to } }, orderBy: { date: 'desc' }, take: 120 },
        leaveBalances: { where: { year: CURRENT_YEAR }, orderBy: { id: 'desc' }, take: 5 },
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 1, where: { createdAt: { gte: from, lte: to } } },
        disciplinaryCases: { where: { status: 'APPROVED', createdAt: { gte: from, lte: to } }, take: 5 },
        employments: { where: { isActive: true }, take: 1 },
      },
      take: 2000,
    });
    return Promise.all(empl.map((e) => this.featureVector(e)));
  }

  private bucketProportions(values: number[]): number[] {
    if (values.length === 0) return [0.98, 0.01, 0.01];
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const buckets: number[][] = [[], [], []];
    const seg = Math.ceil(n / 3);
    for (let i = 0; i < n; i += 1) buckets[Math.min(2, Math.floor(i / seg))].push(sorted[i]);
    const total = values.length;
    return buckets.map((b) => Math.max(0.01, b.length / total));
  }

  private psi(a: number[], b: number[]): number {
    return a.reduce((sum, av, i) => sum + (av - b[i]) * Math.log(av / b[i]), 0);
  }
}
