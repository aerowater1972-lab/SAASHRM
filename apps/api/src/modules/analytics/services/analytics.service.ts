import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SICK_LEAVE_CODES } from '@modules/shared/utils/wage-base.util';
import { AnalyticsFilterDto } from '../dto/analytics-filter.dto';
import { AnalyticsExportDto } from '../dto/analytics-export.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHeadcount(tenantId: string, filters: AnalyticsFilterDto) {
    const { departmentId } = filters;
    const deptFilter = departmentId
      ? Prisma.sql`AND e."departmentId" = ${departmentId}`
      : Prisma.sql``;

    const [byDepartment, byStatus, byGrade, byGender] = await Promise.all([
      this.prisma.$queryRaw<{ department: string; count: bigint }[]>`
        SELECT d.name AS department, COUNT(*)::int AS count
        FROM "Employee" emp
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Department" d ON d.id = e."departmentId"
        WHERE emp."tenantId" = ${tenantId} AND emp."deletedAt" IS NULL
        ${deptFilter}
        GROUP BY d.name
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT emp.status, COUNT(*)::int AS count
        FROM "Employee" emp
        WHERE emp."tenantId" = ${tenantId} AND emp."deletedAt" IS NULL
        GROUP BY emp.status
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ grade: string; count: bigint }[]>`
        SELECT g.name AS grade, COUNT(*)::int AS count
        FROM "Employee" emp
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Grade" g ON g.id = e."gradeId"
        WHERE emp."tenantId" = ${tenantId} AND emp."deletedAt" IS NULL
        ${deptFilter}
        GROUP BY g.name
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ gender: string; count: bigint }[]>`
        SELECT emp.gender, COUNT(*)::int AS count
        FROM "Employee" emp
        WHERE emp."tenantId" = ${tenantId} AND emp."deletedAt" IS NULL
        ${deptFilter}
        GROUP BY emp.gender
        ORDER BY count DESC
      `,
    ]);

    return { byDepartment, byStatus, byGrade, byGender };
  }

  async getHeadcountTrend(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const rows = await this.prisma.$queryRaw<{ period: string; count: bigint }[]>`
      SELECT TO_CHAR(emp."startDate", 'YYYY-MM') AS period, COUNT(*)::int AS count
      FROM "Employee" emp
      WHERE emp."tenantId" = ${tenantId}
        AND emp."deletedAt" IS NULL
        AND emp."startDate" IS NOT NULL
        AND emp."startDate" >= ${start}::date
        AND emp."startDate" <= ${end}::date
      GROUP BY period
      ORDER BY period ASC
    `;

    return { trend: rows };
  }

  async getAttendanceSummary(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate, departmentId } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';
    const deptFilter = departmentId
      ? Prisma.sql`AND e."departmentId" = ${departmentId}`
      : Prisma.sql``;

    const summary = await this.prisma.$queryRaw<
      { total: bigint; present: bigint; late: bigint; absent: bigint; early_leave: bigint }[]
    >`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present,
        COUNT(*) FILTER (WHERE ar.status = 'LATE')::int AS late,
        COUNT(*) FILTER (WHERE ar.status = 'ABSENT')::int AS absent,
        COUNT(*) FILTER (WHERE ar.status = 'EARLY_LEAVE')::int AS early_leave
      FROM "AttendanceRecord" ar
      JOIN "Employee" emp ON emp.id = ar."employeeId"
      LEFT JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
      WHERE ar."tenantId" = ${tenantId}
        AND ar.date >= ${start}::date
        AND ar.date <= ${end}::date
        ${deptFilter}
    `;

    const row = summary[0] || { total: 0, present: 0, late: 0, absent: 0, early_leave: 0 };
    const total = Number(row.total) || 1;

    return {
      totalRecords: Number(row.total),
      present: Number(row.present),
      late: Number(row.late),
      absent: Number(row.absent),
      earlyLeave: Number(row.early_leave),
      avgPresence: total > 0 ? Number(((Number(row.present) / total) * 100).toFixed(2)) : 0,
      latePercentage: total > 0 ? Number(((Number(row.late) / total) * 100).toFixed(2)) : 0,
      absentPercentage: total > 0 ? Number(((Number(row.absent) / total) * 100).toFixed(2)) : 0,
    };
  }

  async getAttendanceByDepartment(tenantId: string, departmentId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const rows = await this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT ar.status, COUNT(*)::int AS count
      FROM "AttendanceRecord" ar
      JOIN "Employee" emp ON emp.id = ar."employeeId"
      JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
      WHERE ar."tenantId" = ${tenantId}
        AND e."departmentId" = ${departmentId}
        AND ar.date >= ${start}::date
        AND ar.date <= ${end}::date
      GROUP BY ar.status
    `;

    const total = rows.reduce<number>((s: number, r: { count: bigint }) => s + Number(r.count), 0) || 1;
    const enriched = rows.map((r: { status: string; count: bigint }) => ({
      status: r.status,
      count: Number(r.count),
      percentage: Number(((Number(r.count) / total) * 100).toFixed(2)),
    }));

    return { departmentId, total, breakdown: enriched };
  }

  async getLeaveSummary(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate, departmentId } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';
    const deptFilter = departmentId
      ? Prisma.sql`AND e."departmentId" = ${departmentId}`
      : Prisma.sql``;

    const [byType, byDepartment, totals] = await Promise.all([
      this.prisma.$queryRaw<{ leaveType: string; totalDays: number; count: bigint }[]>`
        SELECT lt.name AS "leaveType",
               COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
               COUNT(*)::int AS count
        FROM "LeaveRequest" lr
        JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
        JOIN "Employee" emp ON emp.id = lr."employeeId"
        LEFT JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        WHERE lr."tenantId" = ${tenantId}
          AND lr.status = 'APPROVED'
          AND lr."startDate" >= ${start}::date
          AND lr."endDate" <= ${end}::date
          ${deptFilter}
        GROUP BY lt.name
        ORDER BY "totalDays" DESC
      `,
      // Utilisasi cuti per departemen (kebutuhan laporan manajemen mingguan/bulanan).
      // Karyawan tanpa employment aktif masuk 'Tanpa Departemen'.
      this.prisma.$queryRaw<{ department: string; totalDays: number; count: bigint }[]>`
        SELECT COALESCE(d.name, 'Tanpa Departemen') AS department,
               COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
               COUNT(*)::int AS count
        FROM "LeaveRequest" lr
        JOIN "Employee" emp ON emp.id = lr."employeeId"
        LEFT JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        LEFT JOIN "Department" d ON d.id = e."departmentId"
        WHERE lr."tenantId" = ${tenantId}
          AND lr.status = 'APPROVED'
          AND lr."startDate" >= ${start}::date
          AND lr."endDate" <= ${end}::date
          ${deptFilter}
        GROUP BY d.name
        ORDER BY "totalDays" DESC
      `,
      this.prisma.$queryRaw<{ totalDays: number; totalRequests: bigint }[]>`
        SELECT COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
               COUNT(*)::int AS "totalRequests"
        FROM "LeaveRequest" lr
        WHERE lr."tenantId" = ${tenantId}
          AND lr.status = 'APPROVED'
          AND lr."startDate" >= ${start}::date
          AND lr."endDate" <= ${end}::date
      `,
    ]);

    return {
      totalDays: Number(totals[0]?.totalDays || 0),
      totalRequests: Number(totals[0]?.totalRequests || 0),
      byLeaveType: byType.map((r: { leaveType: string; totalDays: number; count: bigint }) => ({
        leaveType: r.leaveType,
        totalDays: Number(r.totalDays),
        count: Number(r.count),
      })),
      byDepartment: byDepartment.map((r: { department: string; totalDays: number; count: bigint }) => ({
        department: r.department,
        totalDays: Number(r.totalDays),
        count: Number(r.count),
      })),
    };
  }

  async getPayrollSummary(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const [totals, byDepartment] = await Promise.all([
      this.prisma.$queryRaw<{ totalPayroll: number; totalEmployees: bigint; avgSalary: number }[]>`
        SELECT
          COALESCE(SUM(p."netPay"), 0)::numeric AS "totalPayroll",
          COUNT(DISTINCT p."employeeId")::int AS "totalEmployees",
          COALESCE(AVG(p."netPay"), 0)::numeric AS "avgSalary"
        FROM "Payslip" p
        JOIN "PayrollRun" pr ON pr.id = p."runId"
        JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
        WHERE p."tenantId" = ${tenantId}
          AND pp."startDate" >= ${start}::date
          AND pp."endDate" <= ${end}::date
          AND pr.status = 'COMPLETED'
      `,
      this.prisma.$queryRaw<{ department: string; totalPayroll: number; employeeCount: bigint; avgSalary: number }[]>`
        SELECT
          d.name AS department,
          COALESCE(SUM(p."netPay"), 0)::numeric AS "totalPayroll",
          COUNT(DISTINCT p."employeeId")::int AS "employeeCount",
          COALESCE(AVG(p."netPay"), 0)::numeric AS "avgSalary"
        FROM "Payslip" p
        JOIN "PayrollRun" pr ON pr.id = p."runId"
        JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
        JOIN "Employee" emp ON emp.id = p."employeeId"
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Department" d ON d.id = e."departmentId"
        WHERE p."tenantId" = ${tenantId}
          AND pp."startDate" >= ${start}::date
          AND pp."endDate" <= ${end}::date
          AND pr.status = 'COMPLETED'
        GROUP BY d.name
        ORDER BY "totalPayroll" DESC
      `,
    ]);

    return {
      totalPayroll: Number(totals[0]?.totalPayroll || 0),
      totalEmployees: Number(totals[0]?.totalEmployees || 0),
      avgSalary: Number(totals[0]?.avgSalary || 0),
      byDepartment: byDepartment.map((r: { department: string; totalPayroll: number; employeeCount: bigint; avgSalary: number }) => ({
        department: r.department,
        totalPayroll: Number(r.totalPayroll),
        employeeCount: Number(r.employeeCount),
        avgSalary: Number(r.avgSalary),
      })),
    };
  }

  async getPayrollByComponent(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const rows = await this.prisma.$queryRaw<{ componentType: string; totalAmount: number; employeeCount: bigint; avgAmount: number }[]>`
      SELECT
        pc.type AS "componentType",
        COALESCE(SUM(pi.amount), 0)::numeric AS "totalAmount",
        COUNT(DISTINCT ps."employeeId")::int AS "employeeCount",
        COALESCE(AVG(pi.amount), 0)::numeric AS "avgAmount"
      FROM "PayrollItem" pi
      JOIN "PayrollComponent" pc ON pc.id = pi."componentId"
      JOIN "Payslip" ps ON ps.id = pi."payslipId"
      JOIN "PayrollRun" pr ON pr.id = ps."runId"
      JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
      WHERE ps."tenantId" = ${tenantId}
        AND pp."startDate" >= ${start}::date
        AND pp."endDate" <= ${end}::date
        AND pr.status = 'COMPLETED'
      GROUP BY pc.type
      ORDER BY "totalAmount" DESC
    `;

    return {
      breakdown: rows.map((r: { componentType: string; totalAmount: number; employeeCount: bigint; avgAmount: number }) => ({
        componentType: r.componentType,
        totalAmount: Number(r.totalAmount),
        employeeCount: Number(r.employeeCount),
        avgAmount: Number(r.avgAmount),
      })),
    };
  }

  async getRecruitmentFunnel(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const rows = await this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT a.status, COUNT(*)::int AS count
      FROM "Application" a
      WHERE a."tenantId" = ${tenantId}
        AND a."appliedAt" >= ${start}::date
        AND a."appliedAt" <= ${end}::date
      GROUP BY a.status
      ORDER BY count DESC
    `;

    const total = rows.reduce<number>((s: number, r: { count: bigint }) => s + Number(r.count), 0) || 1;

    return {
      totalApplications: total,
      funnel: rows.map((r: { status: string; count: bigint }) => ({
        stage: r.status,
        count: Number(r.count),
        conversionRate: Number(((Number(r.count) / total) * 100).toFixed(2)),
      })),
    };
  }

  async getTimeToHire(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const result = await this.prisma.$queryRaw<{ avgDays: number; minDays: number; maxDays: number; totalHired: bigint }[]>`
      SELECT
        COALESCE(AVG(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "avgDays",
        COALESCE(MIN(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "minDays",
        COALESCE(MAX(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "maxDays",
        COUNT(*)::int AS "totalHired"
      FROM "Application" a
      JOIN "Offer" o ON o."applicationId" = a.id
      WHERE a."tenantId" = ${tenantId}
        AND o.status = 'ACCEPTED'
        AND o."acceptedAt" IS NOT NULL
        AND a."appliedAt" >= ${start}::date
        AND a."appliedAt" <= ${end}::date
    `;

    return {
      avgDays: Math.round(Number(result[0]?.avgDays || 0)),
      minDays: Math.round(Number(result[0]?.minDays || 0)),
      maxDays: Math.round(Number(result[0]?.maxDays || 0)),
      totalHired: Number(result[0]?.totalHired || 0),
    };
  }

  async getPerformanceDistribution(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const [distribution, summary] = await Promise.all([
      this.prisma.$queryRaw<{ scoreRange: string; count: bigint }[]>`
        SELECT
          CASE
            WHEN pr."overallScore" >= 4.5 THEN '4.5-5.0'
            WHEN pr."overallScore" >= 4.0 THEN '4.0-4.4'
            WHEN pr."overallScore" >= 3.5 THEN '3.5-3.9'
            WHEN pr."overallScore" >= 3.0 THEN '3.0-3.4'
            WHEN pr."overallScore" >= 2.5 THEN '2.5-2.9'
            WHEN pr."overallScore" >= 2.0 THEN '2.0-2.4'
            ELSE '0.0-1.9'
          END AS "scoreRange",
          COUNT(*)::int AS count
        FROM "PerformanceReview" pr
        WHERE pr."tenantId" = ${tenantId}
          AND pr."overallScore" IS NOT NULL
          AND pr."submittedAt" >= ${start}::date
          AND pr."submittedAt" <= ${end}::date
        GROUP BY "scoreRange"
        ORDER BY "scoreRange" ASC
      `,
      this.prisma.$queryRaw<{ avgScore: number; totalReviews: bigint }[]>`
        SELECT
          COALESCE(AVG(pr."overallScore"), 0)::numeric AS "avgScore",
          COUNT(*)::int AS "totalReviews"
        FROM "PerformanceReview" pr
        WHERE pr."tenantId" = ${tenantId}
          AND pr."overallScore" IS NOT NULL
          AND pr."submittedAt" >= ${start}::date
          AND pr."submittedAt" <= ${end}::date
      `,
    ]);

    return {
      averageScore: Number(summary[0]?.avgScore || 0),
      totalReviews: Number(summary[0]?.totalReviews || 0),
      distribution: distribution.map((r: { scoreRange: string; count: bigint }) => ({
        scoreRange: r.scoreRange,
        count: Number(r.count),
      })),
    };
  }

  async getTurnoverRate(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate, period } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';
    // Whitelist the period into a fixed TO_CHAR format literal (no user input reaches SQL).
    const dateTrunc = period === 'YEARLY' ? 'YYYY' : period === 'QUARTERLY' ? 'YYYY-Q' : 'YYYY-MM';

    const rows = await this.prisma.$queryRaw<{ period: string; hired: bigint; resigned: bigint; headcount: bigint; turnoverRate: number }[]>`
      WITH date_series AS (
        SELECT generate_series(
          date_trunc('month', ${start}::date),
          date_trunc('month', ${end}::date),
          '1 month'::interval
        )::date AS month_start
      ),
      monthly_hires AS (
        SELECT date_trunc('month', emp."startDate") AS month, COUNT(*)::int AS hired
        FROM "Employee" emp
        WHERE emp."tenantId" = ${tenantId}
          AND emp."startDate" IS NOT NULL
          AND emp."startDate" >= ${start}::date
          AND emp."startDate" <= ${end}::date
        GROUP BY month
      ),
      monthly_resignations AS (
        SELECT date_trunc('month', rr."effectiveDate") AS month, COUNT(*)::int AS resigned
        FROM "ResignationRequest" rr
        WHERE rr."tenantId" = ${tenantId}
          AND rr.status = 'APPROVED'
          AND rr."effectiveDate" >= ${start}::date
          AND rr."effectiveDate" <= ${end}::date
        GROUP BY month
      ),
      monthly_headcount AS (
        SELECT date_trunc('month', ds.month_start) AS month,
               (SELECT COUNT(*) FROM "Employee" e
                WHERE e."tenantId" = ${tenantId}
                  AND e."deletedAt" IS NULL
                  AND e."startDate" <= ds.month_start + interval '1 month'
                  AND (e."endDate" IS NULL OR e."endDate" > ds.month_start)
               )::int AS headcount
        FROM date_series ds
      )
      SELECT
        TO_CHAR(mh.month, ${dateTrunc}) AS period,
        COALESCE(mh.hired, 0)::int AS hired,
        COALESCE(mr.resigned, 0)::int AS resigned,
        COALESCE(mhc.headcount, 0)::int AS headcount,
        CASE
          WHEN COALESCE(mhc.headcount, 0) > 0
          THEN ROUND((COALESCE(mr.resigned, 0)::numeric / NULLIF(mhc.headcount, 0)) * 100, 2)
          ELSE 0
        END AS "turnoverRate"
      FROM monthly_hires mh
      FULL JOIN monthly_resignations mr ON mr.month = mh.month
      FULL JOIN monthly_headcount mhc ON mhc.month = COALESCE(mh.month, mr.month)
      ORDER BY period ASC
    `;

    return {
      turnover: rows.map((r: { period: string; hired: bigint; resigned: bigint; headcount: bigint; turnoverRate: number }) => ({
        period: r.period,
        hired: Number(r.hired),
        resigned: Number(r.resigned),
        headcount: Number(r.headcount),
        turnoverRate: Number(r.turnoverRate),
      })),
    };
  }

  async getDashboardSummary(tenantId: string, filters: AnalyticsFilterDto) {
    const [headcount, attendance, leave, payroll, recruitment, performance, turnover, timeToHire] =
      await Promise.all([
        this.getHeadcount(tenantId, filters),
        this.getAttendanceSummary(tenantId, filters),
        this.getLeaveSummary(tenantId, filters),
        this.getPayrollSummary(tenantId, filters),
        this.getRecruitmentFunnel(tenantId, filters),
        this.getPerformanceDistribution(tenantId, filters),
        this.getTurnoverRate(tenantId, filters),
        this.getTimeToHire(tenantId, filters),
      ]);

    const headcountTotal = Number(
      (
        await this.prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*)::int AS total
          FROM "Employee" emp
          WHERE emp."tenantId" = ${tenantId}
            AND emp."deletedAt" IS NULL
            AND emp.status = 'ACTIVE'
        `
      )[0]?.total || 0,
    );

    const totalResigned = Number(turnover.turnover?.reduce(
      (sum: number, r: { resigned: number }) => sum + (r.resigned || 0),
      0,
    ) || 0);
    const avgHeadcount = (turnover.turnover?.reduce(
      (sum: number, r: { headcount: number }) => sum + (r.headcount || 0),
      0,
    ) || 0) || 1;
    const turnoverRate = avgHeadcount > 0 ? Number(((totalResigned / avgHeadcount) * 100).toFixed(2)) : 0;

    return {
      headcount: {
        total: headcountTotal,
        byDepartment: (headcount.byDepartment || []).map(
          (r: { department: string; count: bigint }) => ({ name: r.department, value: Number(r.count) }),
        ),
        byStatus: (headcount.byStatus || []).map(
          (r: { status: string; count: bigint }) => ({ name: r.status, value: Number(r.count) }),
        ),
        byGrade: (headcount.byGrade || []).map(
          (r: { grade: string; count: bigint }) => ({ name: r.grade, value: Number(r.count) }),
        ),
      },
      attendance: {
        avgPresence: attendance.avgPresence ?? 0,
        latePercentage: attendance.latePercentage ?? 0,
        absentPercentage: attendance.absentPercentage ?? 0,
        present: attendance.present ?? 0,
        total: attendance.totalRecords ?? 0,
      },
      leave: {
        totalUsed: leave.totalDays ?? 0,
        totalRequests: leave.totalRequests ?? 0,
        byType: (leave.byLeaveType || []).map(
          (r: { leaveType: string; totalDays: number }) => ({ name: r.leaveType, value: Number(r.totalDays) }),
        ),
      },
      payroll: {
        totalPayroll: payroll.totalPayroll ?? 0,
        averageSalary: payroll.avgSalary ?? 0,
        byDepartment: (payroll.byDepartment || []).map(
          (r: { department: string; totalPayroll: number }) => ({
            name: r.department,
            value: Number(r.totalPayroll),
          }),
        ),
      },
      recruitment: {
        totalApplications: recruitment.totalApplications ?? 0,
        byStage: (recruitment.funnel || []).map(
          (r: { stage: string; count: number }) => ({ name: r.stage, value: r.count }),
        ),
        averageTimeToHire: timeToHire.avgDays ?? 0,
      },
      performance: {
        averageScore: performance.averageScore ?? 0,
        totalReviews: performance.totalReviews ?? 0,
        byScore: (performance.distribution || []).map(
          (r: { scoreRange: string; count: number }) => ({ name: r.scoreRange, value: r.count }),
        ),
      },
      turnover: {
        rate: turnoverRate,
        totalResigned,
        byPeriod: turnover.turnover || [],
      },
    };
  }

  /**
   * Skor Bradford (S^2 x D) 12 bulan terakhir dari cuti sakit
   * (SICK_LEAVE_CODES — SL/CS per tenant): S = episode (request APPROVED),
   * D = total hari. Ambang umum: <500 rendah, 500-999 sedang, >=1000 tinggi
   * (perlu konseling/HR review).
   */
  async getBradfordScores(tenantId: string, filters: AnalyticsFilterDto & { limit?: number } = {} as any) {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 365 * 86400000);

    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED' as any,
        startDate: { gte: start },
        endDate: { lte: end },
        leaveType: { code: { in: SICK_LEAVE_CODES } },
      } as any,
      select: { employeeId: true, totalDays: true, employee: { select: { fullName: true, employeeId: true } } } as any,
    });

    const byEmp = new Map<string, { spells: number; days: number; fullName?: string; employeeCode?: string }>();
    for (const r of rows as any[]) {
      const e = byEmp.get(r.employeeId) ?? { spells: 0, days: 0, fullName: r.employee?.fullName, employeeCode: r.employee?.employeeId };
      e.spells += 1;
      e.days += Number(r.totalDays || 0);
      byEmp.set(r.employeeId, e);
    }

    const scores = [...byEmp.entries()].map(([employeeId, v]) => {
      const score = v.spells * v.spells * v.days;
      return {
        employeeId,
        fullName: v.fullName,
        employeeCode: v.employeeCode,
        spells: v.spells,
        sickDays: v.days,
        bradfordScore: score,
        band: score >= 1000 ? 'HIGH' : score >= 500 ? 'MEDIUM' : 'LOW',
      };
    }).sort((a, b) => b.bradfordScore - a.bradfordScore);

    const limit = Math.max(1, Math.min(200, Number((filters as any).limit || 50)));
    return { window: { start, end }, count: scores.length, scores: scores.slice(0, limit) };
  }

  /**
   * Flight-risk heuristik 0-100 (bukan prediksi ML): Bradford tinggi +35,
   * SP aktif +25 (SP3 +10), lembur 90 hari >1080 mnt +15, PIP aktif +15,
   * tanpa IDP aktif +10. Band: >=60 HIGH, 30-59 MEDIUM, <30 LOW.
   */
  async getFlightRisk(tenantId: string, filters: AnalyticsFilterDto = {} as any) {
    const now = new Date();
    const ago90 = new Date(now.getTime() - 90 * 86400000);

    const [bradford, sps, overtime, pips, idps, employees] = await Promise.all([
      this.getBradfordScores(tenantId, { ...filters, limit: 500 } as any),
      this.prisma.disciplinaryCase.findMany({
        where: {
          tenantId, deletedAt: null,
          status: { in: ['APPROVED', 'ACKNOWLEDGED'] as any },
          validUntil: { gte: now },
        },
        select: { employeeId: true, spLevel: true },
      }),
      this.prisma.overtimeRecord.findMany({
        where: { tenantId, isPaid: true, date: { gte: ago90 } },
        select: { employeeId: true, payableMinutes: true },
      }),
      this.prisma.goal.findMany({
        where: { tenantId, status: 'IN_PROGRESS' as any, title: { startsWith: '[PIP]' } },
        select: { employeeId: true },
      }),
      this.prisma.individualDevelopmentPlan.findMany({
        where: { tenantId, status: { in: ['DRAFT', 'ACTIVE'] as any } },
        select: { employeeId: true },
      }),
      this.prisma.employee.findMany({
        where: { tenantId, deletedAt: null, status: 'ACTIVE' as any },
        select: { id: true, fullName: true, employeeId: true },
      }),
    ]);

    const brad = new Map((bradford.scores as any[]).map((s) => [s.employeeId, s.bradfordScore]));
    const sp = new Map<string, string>();
    for (const c of sps as any[]) sp.set(c.employeeId, c.spLevel);
    const ot = new Map<string, number>();
    for (const r of overtime as any[]) ot.set(r.employeeId, (ot.get(r.employeeId) || 0) + Number(r.payableMinutes || 0));
    const pipSet = new Set((pips as any[]).map((g) => g.employeeId));
    const idpSet = new Set((idps as any[]).map((p) => p.employeeId));

    const people = (employees as any[]).map((e) => {
      const signals: string[] = [];
      let score = 0;
      const b = Number(brad.get(e.id) || 0);
      if (b >= 1000) { score += 35; signals.push(`Bradford ${b}`); }
      else if (b >= 500) { score += 15; signals.push(`Bradford ${b}`); }
      const level = sp.get(e.id);
      if (level) {
        score += 25; signals.push(`SP ${level} aktif`);
        if (level === 'SP3') { score += 10; signals.push('SP3'); }
      }
      if ((ot.get(e.id) || 0) > 1080) { score += 15; signals.push('Lembur >18 jam/90 hari'); }
      if (pipSet.has(e.id)) { score += 15; signals.push('PIP aktif'); }
      if (!idpSet.has(e.id)) { score += 10; signals.push('Tanpa IDP aktif'); }
      score = Math.min(100, score);
      return {
        employeeId: e.id, fullName: e.fullName, employeeCode: e.employeeId,
        riskScore: score,
        band: score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW',
        signals,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    return {
      generatedAt: now,
      high: people.filter((p) => p.band === 'HIGH').length,
      medium: people.filter((p) => p.band === 'MEDIUM').length,
      low: people.filter((p) => p.band === 'LOW').length,
      people: people.slice(0, 100),
    };
  }

  /**
   * Lembur per grade (kebutuhan dashboard manajemen): total menit berbayar
   * (OvertimeRecord.isPaid) + sesi + rata-rata per karyawan dalam jendela.
   */
  async getOvertimeByGrade(tenantId: string, filters: AnalyticsFilterDto = {} as any) {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 90 * 86400000);

    const records = await this.prisma.overtimeRecord.findMany({
      where: { tenantId, isPaid: true, date: { gte: start, lte: end } },
      select: {
        employeeId: true,
        payableMinutes: true,
        employee: {
          select: {
            employments: {
              where: { isActive: true },
              take: 1,
              select: { grade: { select: { level: true, name: true } } },
            },
          },
        },
      },
    });

    const byGrade = new Map<string, { level: number; minutes: number; sessions: number; employees: Set<string> }>();
    for (const r of records as any[]) {
      const grade = r.employee?.employments?.[0]?.grade;
      const key = grade ? `L${grade.level} ${grade.name}` : 'Tanpa Grade';
      const e = byGrade.get(key) ?? { level: grade?.level ?? 999, minutes: 0, sessions: 0, employees: new Set<string>() };
      e.minutes += Number(r.payableMinutes || 0);
      e.sessions += 1;
      e.employees.add(r.employeeId);
      byGrade.set(key, e);
    }

    const rows = [...byGrade.entries()]
      .map(([grade, v]) => ({
        grade,
        level: v.level,
        totalMinutes: v.minutes,
        totalHours: Math.round((v.minutes / 60) * 10) / 10,
        sessions: v.sessions,
        employeeCount: v.employees.size,
        avgMinutesPerEmployee: v.employees.size > 0 ? Math.round(v.minutes / v.employees.size) : 0,
      }))
      .sort((a, b) => a.level - b.level);

    return { window: { start, end }, grades: rows };
  }

  /**
   * Gender pay gap (KEBSD requirement): rata-rata gaji per gender + gap persentase.
   */
  async getGenderPayGap(tenantId: string, filters: AnalyticsFilterDto = {} as any) {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 365 * 86400000);

    const rows = await this.prisma.$queryRaw<{ gender: string; avgSalary: number; employeeCount: number }[]>`
      SELECT emp.gender,
             ROUND(AVG(CAST(e."baseSalary" AS NUMERIC))) AS "avgSalary",
             COUNT(*)::int AS "employeeCount"
      FROM "Employee" emp
      JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
      WHERE emp."tenantId" = ${tenantId}
        AND emp."deletedAt" IS NULL
        AND emp.gender IS NOT NULL
      GROUP BY emp.gender
      ORDER BY "avgSalary" DESC
    `;

    let male = rows.find((r) => r.gender === 'MALE');
    let female = rows.find((r) => r.gender === 'FEMALE');
    let gapPct = 0;
    if (male && female && male.avgSalary > 0) {
      gapPct = Math.round(((male.avgSalary - female.avgSalary) / male.avgSalary) * 10000) / 100;
    }

    return { byGender: rows, gapPercentage: gapPct, maleAvg: male?.avgSalary ?? 0, femaleAvg: female?.avgSalary ?? 0 };
  }

  /**
   * Laporan Ketenagakerjaan (LK) / Kartu Penerimaan Peraturan Perundang-undangan (KPHPP)
   * Laporan bulanan wajib ke Kemenaker sesuai Permenaker No. 6/2016 dan Permenaker No. 18/2020
   * Mencakup: tenaga kerja, jam kerja, lembur, cuti, K3, hubungan industrial, pelatihan
   */
  async getLkKphppReport(tenantId: string, filters: AnalyticsFilterDto = {} as any) {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 30 * 86400000);

    // 1. Tenaga Kerja (TK) - Headcount
    const headcount = await this.getHeadcount(tenantId, { ...filters, startDate: undefined, endDate: undefined });
    const totalEmployees = headcount.byDepartment.reduce((sum: number, d: any) => sum + Number(d.count), 0);
    const byGender = (await this.prisma.$queryRaw<{ gender: string; count: bigint }[]>`
      SELECT emp.gender, COUNT(*)::int AS count
      FROM "Employee" emp
      WHERE emp."tenantId" = ${tenantId} AND emp."deletedAt" IS NULL
      GROUP BY emp.gender
    `).map(r => ({ gender: r.gender, count: Number(r.count) }));

    // 2. Jumlah Lembur
    const overtime = await this.getOvertimeByGrade(tenantId, { ...filters, startDate: start.toISOString().slice(0,10), endDate: end.toISOString().slice(0,10) });

    // 3. Cuti
    const leave = await this.getLeaveSummary(tenantId, { ...filters, startDate: start.toISOString().slice(0,10), endDate: end.toISOString().slice(0,10) });

    // 3. K3 - Kecelakaan Kerja
    const k3 = await this.prisma.incidentReport.findMany({
      where: { tenantId, incidentDate: { gte: start, lte: end }, deletedAt: null },
      select: { severity: true, category: true },
    });
    const k3BySeverity = k3.reduce((acc: Record<string, number>, r: any) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const k3ByCategory = k3.reduce((acc: Record<string, number>, r: any) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 4. Hubungan Industrial - SP / PHK
    const spCases = await this.prisma.disciplinaryCase.findMany({
      where: { tenantId, issuedDate: { gte: start, lte: end }, deletedAt: null },
      select: { spLevel: true, status: true, violationCategory: { select: { name: true } } },
    });
    const spByLevel = spCases.reduce((acc: Record<string, number>, c: any) => {
      acc[c.spLevel] = (acc[c.spLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const spByCategory = spCases.reduce((acc: Record<string, number>, c: any) => {
      const cat = c.violationCategory?.name || 'UNKNOWN';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 5. Pelatihan K3
    const k3Trainings = await this.prisma.trainingParticipant.count({
      where: {
        training: { tenantId, category: 'K3', status: 'COMPLETED' },
        status: 'COMPLETED',
      },
    });

    // 6. PHK - menggunakan type TERMINATION (EFFICIENCY tidak ada di enum ResignationType, gunakan TERMINATION)
    const phkCases = await this.prisma.resignationRequest.findMany({
      where: { tenantId, type: { in: ['TERMINATION', 'EFFICIENCY'] as any }, effectiveDate: { gte: start, lte: end } },
      select: { type: true },
    });

    return {
      period: { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) },
      tenagaKerja: {
        total: totalEmployees,
        byGender,
        byDepartment: headcount.byDepartment,
        byStatus: headcount.byStatus,
        byGrade: headcount.byGrade,
      },
      jamKerja: {
        totalOvertimeHours: overtime.grades.reduce((sum: number, g: any) => sum + g.totalHours, 0),
        totalOvertimeMinutes: overtime.grades.reduce((sum: number, g: any) => sum + g.totalMinutes, 0),
        totalSessions: overtime.grades.reduce((sum: number, g: any) => sum + g.sessions, 0),
        byGrade: overtime.grades.map((g: any) => ({
          grade: g.grade,
          totalHours: g.totalHours,
          sessions: g.sessions,
          employeeCount: g.employeeCount,
          avgMinutesPerEmployee: g.avgMinutesPerEmployee,
        })),
      },
      cuti: {
        totalDays: leave.totalDays,
        totalRequests: leave.totalRequests,
        byType: leave.byLeaveType,
      },
      k3: {
        totalIncidents: k3.length,
        bySeverity: k3BySeverity,
        byCategory: k3ByCategory,
        k3TrainingsCompleted: k3Trainings,
      },
      hubunganIndustrial: {
        sp: { byLevel: spByLevel, byCategory: spByCategory, total: spCases.length },
        phk: { total: phkCases.length, byType: phkCases.reduce((acc: Record<string, number>, c: any) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {} as Record<string, number>) },
      },
      pelatihan: {
        k3Completed: k3Trainings,
      },
    };
  }

  async getWorkforceCost(tenantId: string, filters: AnalyticsFilterDto) {
    const [payroll, components] = await Promise.all([
      this.getPayrollSummary(tenantId, filters),
      this.getPayrollByComponent(tenantId, filters),
    ]);

    return {
      totalPayroll: payroll.totalPayroll,
      totalEmployees: payroll.totalEmployees,
      avgSalary: payroll.avgSalary,
      byDepartment: payroll.byDepartment,
      components: components.breakdown,
    };
  }

  async exportReport(
    tenantId: string,
    userId: string | null,
    dto: AnalyticsExportDto,
  ) {
    const format = dto.format || 'csv';
    const filters = dto.filters || ({} as AnalyticsFilterDto);

    let data: any;
    switch (dto.report) {
      case 'turnover':
        data = await this.getTurnoverRate(tenantId, filters);
        break;
      case 'workforce-cost':
        data = await this.getWorkforceCost(tenantId, filters);
        break;
      case 'bradford':
        data = await this.getBradfordScores(tenantId, filters);
        break;
      case 'leave':
        data = await this.getLeaveSummary(tenantId, filters);
        break;
      case 'overtime':
        data = await this.getOvertimeByGrade(tenantId, filters);
        break;
      case 'gender-pay-gap':
        data = await this.getGenderPayGap(tenantId, filters);
        break;
      case 'lk-kphpp':
        data = await this.getLkKphppReport(tenantId, filters);
        break;
      case 'flight-risk':
        data = await this.getFlightRisk(tenantId, filters);
        break;
      case 'headcount':
      default:
        data = await this.getHeadcount(tenantId, filters);
        break;
    }

    const isPdf = format === 'pdf';
    const content = isPdf
      ? this.toPdf(dto.report, this.toCsv(dto.report, data)).toString('base64')
      : this.toCsv(dto.report, data);
    const extension = isPdf ? 'pdf' : 'csv';

    return {
      report: dto.report,
      format,
      filename: `analytics-${dto.report}-${new Date().toISOString().slice(0, 10)}.${extension}`,
      exportedBy: userId,
      encoding: isPdf ? 'base64' : 'utf8',
      contentType: isPdf ? 'application/pdf' : 'text/csv',
      content,
    };
  }

  private toCsv(report: string, data: any): string {
    if (report === 'headcount') {
      const lines = ['section,key,count'];
      for (const r of data.byDepartment ?? []) lines.push(`department,${r.department},${r.count}`);
      for (const r of data.byStatus ?? []) lines.push(`status,${r.status},${r.count}`);
      for (const r of data.byGrade ?? []) lines.push(`grade,${r.grade},${r.count}`);
      return lines.join('\n');
    }
    if (report === 'turnover') {
      const lines = ['period,hired,resigned,headcount,turnoverRate'];
      for (const r of data.turnover ?? []) {
        lines.push(`${r.period},${r.hired},${r.resigned},${r.headcount},${r.turnoverRate}`);
      }
      return lines.join('\n');
    }
    if (report === 'workforce-cost') {
      const lines = ['department,totalPayroll,employeeCount,avgSalary'];
      for (const r of data.byDepartment ?? []) {
        lines.push(`${r.department},${r.totalPayroll},${r.employeeCount},${r.avgSalary}`);
      }
      return lines.join('\n');
    }
    if (report === 'bradford') {
      const lines = ['employeeCode,fullName,spells,sickDays,bradfordScore,band'];
      for (const r of data.scores ?? []) {
        lines.push(`${r.employeeCode},${r.fullName},${r.spells},${r.sickDays},${r.bradfordScore},${r.band}`);
      }
      return lines.join('\n');
    }
    if (report === 'leave') {
      const lines = ['department,totalDays,requestCount'];
      for (const r of data.byDepartment ?? []) {
        lines.push(`${r.department},${r.totalDays},${r.count}`);
      }
      return lines.join('\n');
    }
    if (report === 'lk-kphpp') {
      const lines = [
        'section,key,value',
        `period,start,${data.period.start}`,
        `period,end,${data.period.end}`,
        `tenagaKerja,total,${data.tenagaKerja.total}`,
        ...data.tenagaKerja.byGender.map((r: any) => `tenagaKerja,gender_${r.gender},${r.count}`),
        ...data.tenagaKerja.byDepartment.map((r: any) => `tenagaKerja,dept_${r.department},${r.count}`),
        `jamKerja,totalOvertimeHours,${data.jamKerja.totalOvertimeHours}`,
        `jamKerja,totalOvertimeMinutes,${data.jamKerja.totalOvertimeMinutes}`,
        `jamKerja,totalSessions,${data.jamKerja.totalSessions}`,
        ...data.jamKerja.byGrade.map((r: any) => `jamKerja,${r.grade},${r.totalHours}`),
        `cuti,totalDays,${data.cuti.totalDays}`,
        `cuti,totalRequests,${data.cuti.totalRequests}`,
        ...data.cuti.byType.map((r: any) => `cuti,${r.leaveType},${r.totalDays}`),
        `k3,totalIncidents,${data.k3.totalIncidents}`,
        `k3,k3TrainingsCompleted,${data.k3.k3TrainingsCompleted}`,
        ...Object.entries(data.k3.bySeverity).map(([k, v]) => `k3,severity_${k},${v}`),
        ...Object.entries(data.k3.byCategory).map(([k, v]) => `k3,category_${k},${v}`),
        `hubunganIndustrial,spTotal,${data.hubunganIndustrial.sp.total}`,
        ...Object.entries(data.hubunganIndustrial.sp.byLevel).map(([k, v]) => `hubunganIndustrial,sp_${k},${v}`),
        ...Object.entries(data.hubunganIndustrial.sp.byCategory).map(([k, v]) => `hubunganIndustrial,sp_cat_${k},${v}`),
        `hubunganIndustrial,phkTotal,${data.hubunganIndustrial.phk.total}`,
        ...Object.entries(data.hubunganIndustrial.phk.byType).map(([k, v]) => `hubunganIndustrial,phk_${k},${v}`),
        `pelatihan,k3Completed,${data.pelatihan.k3Completed}`,
      ];
      return lines.join('\n');
    }
    if (report === 'gender-pay-gap') {
      const lines = ['gender,avgSalary,employeeCount'];
      for (const r of data.byGender ?? []) {
        lines.push(`${r.gender},${r.avgSalary},${r.employeeCount}`);
      }
      if (data.gapPercentage !== undefined) {
        lines.push(`gapPercentage,${data.gapPercentage}`);
      }
      return lines.join('\n');
    }
    if (report === 'overtime') {
      const lines = ['grade,totalHours,sessions,employeeCount,avgMinutesPerEmployee'];
      for (const r of data.grades ?? []) {
        lines.push(`${r.grade},${r.totalHours},${r.sessions},${r.employeeCount},${r.avgMinutesPerEmployee}`);
      }
      return lines.join('\n');
    }
    if (report === 'flight-risk') {
      const lines = ['employeeCode,fullName,riskScore,band,signals'];
      for (const r of data.people ?? []) {
        lines.push(`${r.employeeCode},${r.fullName},${r.riskScore},${r.band},"${(r.signals ?? []).join('; ')}"`);
      }
      return lines.join('\n');
    }
    return JSON.stringify(data);
  }

  /**
   * PDF 1.4 satu halaman minimal (Helvetica) tanpa dependensi eksternal.
   * `text` biasanya keluaran toCsv; baris dipotong agar muat satu halaman.
   */
  private toPdf(report: string, text: string): Buffer {
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    let y = 800;
    let stream = `BT /F1 12 Tf 40 ${y} Td (Analytics - ${esc(report)}) Tj ET\n`;
    y -= 22;
    for (const line of String(text).split('\n')) {
      if (y < 40) break;
      stream += `BT /F1 9 Tf 40 ${y} Td (${esc(line.slice(0, 130))}) Tj ET\n`;
      y -= 13;
    }
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${Buffer.byteLength(stream, 'utf-8')} >>\nstream\n${stream}endstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefPos = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return Buffer.from(pdf, 'utf-8');
  }
}
