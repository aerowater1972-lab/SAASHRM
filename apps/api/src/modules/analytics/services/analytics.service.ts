import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AnalyticsFilterDto } from '../dto/analytics-filter.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHeadcount(tenantId: string, filters: AnalyticsFilterDto) {
    const { departmentId } = filters;

    const deptFilter = departmentId
      ? `AND e."departmentId" = '${departmentId}'`
      : '';

    const [byDepartment, byStatus, byGrade] = await Promise.all([
      this.prisma.$queryRawUnsafe<
        { department: string; count: bigint }[]
      >(`
        SELECT d.name AS department, COUNT(*)::int AS count
        FROM "Employee" emp
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Department" d ON d.id = e."departmentId"
        WHERE emp."tenantId" = '${tenantId}' AND emp."deletedAt" IS NULL
        ${deptFilter}
        GROUP BY d.name
        ORDER BY count DESC
      `),
      this.prisma.$queryRawUnsafe<
        { status: string; count: bigint }[]
      >(`
        SELECT emp.status, COUNT(*)::int AS count
        FROM "Employee" emp
        WHERE emp."tenantId" = '${tenantId}' AND emp."deletedAt" IS NULL
        GROUP BY emp.status
        ORDER BY count DESC
      `),
      this.prisma.$queryRawUnsafe<
        { grade: string; count: bigint }[]
      >(`
        SELECT g.name AS grade, COUNT(*)::int AS count
        FROM "Employee" emp
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Grade" g ON g.id = e."gradeId"
        WHERE emp."tenantId" = '${tenantId}' AND emp."deletedAt" IS NULL
        ${deptFilter}
        GROUP BY g.name
        ORDER BY count DESC
      `),
    ]);

    return { byDepartment, byStatus, byGrade };
  }

  async getHeadcountTrend(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const rows = await this.prisma.$queryRawUnsafe<
      { period: string; count: bigint }[]
    >(`
      SELECT TO_CHAR(emp."startDate", 'YYYY-MM') AS period, COUNT(*)::int AS count
      FROM "Employee" emp
      WHERE emp."tenantId" = '${tenantId}'
        AND emp."deletedAt" IS NULL
        AND emp."startDate" IS NOT NULL
        AND emp."startDate" >= '${start}'::date
        AND emp."startDate" <= '${end}'::date
      GROUP BY period
      ORDER BY period ASC
    `);

    return { trend: rows };
  }

  async getAttendanceSummary(tenantId: string, filters: AnalyticsFilterDto) {
    const { startDate, endDate, departmentId } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';
    const deptFilter = departmentId
      ? `AND e."departmentId" = '${departmentId}'`
      : '';

    const summary = await this.prisma.$queryRawUnsafe<
      { total: bigint; present: bigint; late: bigint; absent: bigint; early_leave: bigint }[]
    >(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present,
        COUNT(*) FILTER (WHERE ar.status = 'LATE')::int AS late,
        COUNT(*) FILTER (WHERE ar.status = 'ABSENT')::int AS absent,
        COUNT(*) FILTER (WHERE ar.status = 'EARLY_LEAVE')::int AS early_leave
      FROM "AttendanceRecord" ar
      JOIN "Employee" emp ON emp.id = ar."employeeId"
      LEFT JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
      WHERE ar."tenantId" = '${tenantId}'
        AND ar.date >= '${start}'::date
        AND ar.date <= '${end}'::date
        ${deptFilter}
    `);

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

    const rows = await this.prisma.$queryRawUnsafe<
      { status: string; count: bigint }[]
    >(`
      SELECT ar.status, COUNT(*)::int AS count
      FROM "AttendanceRecord" ar
      JOIN "Employee" emp ON emp.id = ar."employeeId"
      JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
      WHERE ar."tenantId" = '${tenantId}'
        AND e."departmentId" = '${departmentId}'
        AND ar.date >= '${start}'::date
        AND ar.date <= '${end}'::date
      GROUP BY ar.status
    `);

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
      ? `AND e."departmentId" = '${departmentId}'`
      : '';

    const [byType, totals] = await Promise.all([
      this.prisma.$queryRawUnsafe<
        { leaveType: string; totalDays: number; count: bigint }[]
      >(`
        SELECT lt.name AS "leaveType",
               COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
               COUNT(*)::int AS count
        FROM "LeaveRequest" lr
        JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
        JOIN "Employee" emp ON emp.id = lr."employeeId"
        LEFT JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        WHERE lr."tenantId" = '${tenantId}'
          AND lr.status = 'APPROVED'
          AND lr."startDate" >= '${start}'::date
          AND lr."endDate" <= '${end}'::date
          ${deptFilter}
        GROUP BY lt.name
        ORDER BY "totalDays" DESC
      `),
      this.prisma.$queryRawUnsafe<{ totalDays: number; totalRequests: bigint }[]>(`
        SELECT COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
               COUNT(*)::int AS "totalRequests"
        FROM "LeaveRequest" lr
        WHERE lr."tenantId" = '${tenantId}'
          AND lr.status = 'APPROVED'
          AND lr."startDate" >= '${start}'::date
          AND lr."endDate" <= '${end}'::date
      `),
    ]);

    return {
      totalDays: Number(totals[0]?.totalDays || 0),
      totalRequests: Number(totals[0]?.totalRequests || 0),
      byLeaveType: byType.map((r: { leaveType: string; totalDays: number; count: bigint }) => ({
        leaveType: r.leaveType,
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
      this.prisma.$queryRawUnsafe<
        { totalPayroll: number; totalEmployees: bigint; avgSalary: number }[]
      >(`
        SELECT
          COALESCE(SUM(p.net_pay), 0)::numeric AS "totalPayroll",
          COUNT(DISTINCT p."employeeId")::int AS "totalEmployees",
          COALESCE(AVG(p.net_pay), 0)::numeric AS "avgSalary"
        FROM "Payslip" p
        JOIN "PayrollRun" pr ON pr.id = p."runId"
        JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
        WHERE p."tenantId" = '${tenantId}'
          AND pp."startDate" >= '${start}'::date
          AND pp."endDate" <= '${end}'::date
          AND pr.status = 'COMPLETED'
      `),
      this.prisma.$queryRawUnsafe<
        { department: string; totalPayroll: number; employeeCount: bigint; avgSalary: number }[]
      >(`
        SELECT
          d.name AS department,
          COALESCE(SUM(p.net_pay), 0)::numeric AS "totalPayroll",
          COUNT(DISTINCT p."employeeId")::int AS "employeeCount",
          COALESCE(AVG(p.net_pay), 0)::numeric AS "avgSalary"
        FROM "Payslip" p
        JOIN "PayrollRun" pr ON pr.id = p."runId"
        JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
        JOIN "Employee" emp ON emp.id = p."employeeId"
        JOIN "Employment" e ON e."employeeId" = emp.id AND e."isActive" = true
        JOIN "Department" d ON d.id = e."departmentId"
        WHERE p."tenantId" = '${tenantId}'
          AND pp."startDate" >= '${start}'::date
          AND pp."endDate" <= '${end}'::date
          AND pr.status = 'COMPLETED'
        GROUP BY d.name
        ORDER BY "totalPayroll" DESC
      `),
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

    const rows = await this.prisma.$queryRawUnsafe<
      { componentType: string; totalAmount: number; employeeCount: bigint; avgAmount: number }[]
    >(`
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
      WHERE ps."tenantId" = '${tenantId}'
        AND pp."startDate" >= '${start}'::date
        AND pp."endDate" <= '${end}'::date
        AND pr.status = 'COMPLETED'
      GROUP BY pc.type
      ORDER BY "totalAmount" DESC
    `);

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

    const rows = await this.prisma.$queryRawUnsafe<
      { status: string; count: bigint }[]
    >(`
      SELECT a.status, COUNT(*)::int AS count
      FROM "Application" a
      WHERE a."tenantId" = '${tenantId}'
        AND a."appliedAt" >= '${start}'::date
        AND a."appliedAt" <= '${end}'::date
      GROUP BY a.status
      ORDER BY count DESC
    `);

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

    const result = await this.prisma.$queryRawUnsafe<
      { avgDays: number; minDays: number; maxDays: number; totalHired: bigint }[]
    >(`
      SELECT
        COALESCE(AVG(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "avgDays",
        COALESCE(MIN(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "minDays",
        COALESCE(MAX(EXTRACT(DAY FROM (o."acceptedAt" - a."appliedAt"))), 0)::numeric AS "maxDays",
        COUNT(*)::int AS "totalHired"
      FROM "Application" a
      JOIN "Offer" o ON o."applicationId" = a.id
      WHERE a."tenantId" = '${tenantId}'
        AND o.status = 'ACCEPTED'
        AND o."acceptedAt" IS NOT NULL
        AND a."appliedAt" >= '${start}'::date
        AND a."appliedAt" <= '${end}'::date
    `);

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
      this.prisma.$queryRawUnsafe<{ scoreRange: string; count: bigint }[]>(`
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
        WHERE pr."tenantId" = '${tenantId}'
          AND pr."overallScore" IS NOT NULL
          AND pr."submittedAt" >= '${start}'::date
          AND pr."submittedAt" <= '${end}'::date
        GROUP BY "scoreRange"
        ORDER BY "scoreRange" ASC
      `),
      this.prisma.$queryRawUnsafe<{ avgScore: number; totalReviews: bigint }[]>(`
        SELECT
          COALESCE(AVG(pr."overallScore"), 0)::numeric AS "avgScore",
          COUNT(*)::int AS "totalReviews"
        FROM "PerformanceReview" pr
        WHERE pr."tenantId" = '${tenantId}'
          AND pr."overallScore" IS NOT NULL
          AND pr."submittedAt" >= '${start}'::date
          AND pr."submittedAt" <= '${end}'::date
      `),
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
    const dateTrunc = period === 'YEARLY' ? 'YYYY' : period === 'QUARTERLY' ? 'YYYY-Q' : 'YYYY-MM';

    const rows = await this.prisma.$queryRawUnsafe<
      { period: string; hired: bigint; resigned: bigint; headcount: bigint; turnoverRate: number }[]
    >(`
      WITH date_series AS (
        SELECT generate_series(
          date_trunc('month', '${start}'::date),
          date_trunc('month', '${end}'::date),
          '1 month'::interval
        )::date AS month_start
      ),
      monthly_hires AS (
        SELECT date_trunc('month', emp."startDate") AS month, COUNT(*)::int AS hired
        FROM "Employee" emp
        WHERE emp."tenantId" = '${tenantId}'
          AND emp."startDate" IS NOT NULL
          AND emp."startDate" >= '${start}'::date
          AND emp."startDate" <= '${end}'::date
        GROUP BY month
      ),
      monthly_resignations AS (
        SELECT date_trunc('month', rr."effectiveDate") AS month, COUNT(*)::int AS resigned
        FROM "ResignationRequest" rr
        WHERE rr."tenantId" = '${tenantId}'
          AND rr.status = 'APPROVED'
          AND rr."effectiveDate" >= '${start}'::date
          AND rr."effectiveDate" <= '${end}'::date
        GROUP BY month
      ),
      monthly_headcount AS (
        SELECT date_trunc('month', ds.month_start) AS month,
               (SELECT COUNT(*) FROM "Employee" e
                WHERE e."tenantId" = '${tenantId}'
                  AND e."deletedAt" IS NULL
                  AND e."startDate" <= ds.month_start + interval '1 month'
                  AND (e."endDate" IS NULL OR e."endDate" > ds.month_start)
               )::int AS headcount
        FROM date_series ds
      )
      SELECT
        TO_CHAR(mh.month, '${dateTrunc}') AS period,
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
    `);

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
    const { startDate, endDate } = filters;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';

    const [headcount, attendance, leave, payroll, recruitment, performance, turnover] =
      await Promise.all([
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(`
          SELECT COUNT(*)::int AS total
          FROM "Employee" emp
          WHERE emp."tenantId" = '${tenantId}'
            AND emp."deletedAt" IS NULL
            AND emp.status = 'ACTIVE'
        `),
        this.prisma.$queryRawUnsafe<{ present: bigint; total: bigint }[]>(`
          SELECT
            COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present,
            COUNT(*)::int AS total
          FROM "AttendanceRecord" ar
          WHERE ar."tenantId" = '${tenantId}'
            AND ar.date >= '${start}'::date
            AND ar.date <= '${end}'::date
        `),
        this.prisma.$queryRawUnsafe<{ totalDays: number; totalRequests: bigint }[]>(`
          SELECT
            COALESCE(SUM(lr."totalDays"), 0)::numeric AS "totalDays",
            COUNT(*)::int AS "totalRequests"
          FROM "LeaveRequest" lr
          WHERE lr."tenantId" = '${tenantId}'
            AND lr.status = 'APPROVED'
            AND lr."startDate" >= '${start}'::date
            AND lr."endDate" <= '${end}'::date
        `),
        this.prisma.$queryRawUnsafe<{ totalPayroll: number; avgSalary: number }[]>(`
          SELECT
            COALESCE(SUM(p.net_pay), 0)::numeric AS "totalPayroll",
            COALESCE(AVG(p.net_pay), 0)::numeric AS "avgSalary"
          FROM "Payslip" p
          JOIN "PayrollRun" pr ON pr.id = p."runId"
          JOIN "PayrollPeriod" pp ON pp.id = pr."periodId"
          WHERE p."tenantId" = '${tenantId}'
            AND pp."startDate" >= '${start}'::date
            AND pp."endDate" <= '${end}'::date
            AND pr.status = 'COMPLETED'
        `),
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(`
          SELECT COUNT(*)::int AS total
          FROM "Application" a
          WHERE a."tenantId" = '${tenantId}'
            AND a."appliedAt" >= '${start}'::date
            AND a."appliedAt" <= '${end}'::date
        `),
        this.prisma.$queryRawUnsafe<{ avgScore: number; total: bigint }[]>(`
          SELECT
            COALESCE(AVG(pr."overallScore"), 0)::numeric AS "avgScore",
            COUNT(*)::int AS total
          FROM "PerformanceReview" pr
          WHERE pr."tenantId" = '${tenantId}'
            AND pr."overallScore" IS NOT NULL
            AND pr."submittedAt" >= '${start}'::date
            AND pr."submittedAt" <= '${end}'::date
        `),
        this.prisma.$queryRawUnsafe<{ resigned: bigint }[]>(`
          SELECT COUNT(*)::int AS resigned
          FROM "ResignationRequest" rr
          WHERE rr."tenantId" = '${tenantId}'
            AND rr.status = 'APPROVED'
            AND rr."effectiveDate" >= '${start}'::date
            AND rr."effectiveDate" <= '${end}'::date
        `),
      ]);

    return {
      headcount: Number(headcount[0]?.total || 0),
      attendance: {
        present: Number(attendance[0]?.present || 0),
        total: Number(attendance[0]?.total || 0),
        attendanceRate:
          Number(attendance[0]?.total || 0) > 0
            ? Number(
                (
                  (Number(attendance[0]?.present || 0) / Number(attendance[0]?.total || 0)) *
                  100
                ).toFixed(2),
              )
            : 0,
      },
      leave: {
        totalDays: Number(leave[0]?.totalDays || 0),
        totalRequests: Number(leave[0]?.totalRequests || 0),
      },
      payroll: {
        totalPayroll: Number(payroll[0]?.totalPayroll || 0),
        avgSalary: Number(payroll[0]?.avgSalary || 0),
      },
      recruitment: {
        totalApplications: Number(recruitment[0]?.total || 0),
      },
      performance: {
        averageScore: Number(performance[0]?.avgScore || 0),
        totalReviews: Number(performance[0]?.total || 0),
      },
      turnover: {
        totalResigned: Number(turnover[0]?.resigned || 0),
      },
    };
  }
}
