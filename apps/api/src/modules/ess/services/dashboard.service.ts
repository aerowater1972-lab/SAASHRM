import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async getDashboard(tenantId: string, employeeId: string) {
    if (!employeeId) {
      return {
        attendance: null,
        leaveBalances: [],
        upcomingSchedule: [],
        recentPayslips: [],
        pendingApprovals: { total: 0, leaveRequests: 0, corrections: 0 },
        notifications: [],
        k3Profile: { completedK3Trainings: 0, activePpeCount: 0, activeSp: null, recentTrainings: [] },
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [attendance, balances, schedule, payslips, pendingCount, notifications, k3] = await Promise.all([
      this.getTodayAttendance(tenantId, employeeId, today),
      this.getLeaveBalances(tenantId, employeeId),
      this.getUpcomingSchedule(tenantId, employeeId, today),
      this.getRecentPayslips(tenantId, employeeId),
      this.getPendingApprovalsCount(tenantId, employeeId),
      this.getRecentNotifications(tenantId, employeeId),
      this.getEmployeeK3Profile(tenantId, employeeId),
    ]);

    return {
      attendance,
      leaveBalances: balances,
      upcomingSchedule: schedule,
      recentPayslips: payslips,
      pendingApprovals: pendingCount,
      notifications,
      k3Profile: k3,
    };
  }

  private async getTodayAttendance(tenantId: string, employeeId: string, today: Date) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    const shift = await this.prisma.rosterEntry.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      include: { shift: true },
    });

    return {
      isClockedIn: !!record?.clockIn,
      isClockedOut: !!record?.clockOut,
      status: record?.status ?? null,
      clockIn: record?.clockIn ?? null,
      clockOut: record?.clockOut ?? null,
      shift: shift?.shift ?? null,
      date: today,
    };
  }

  private async getLeaveBalances(tenantId: string, employeeId: string) {
    const year = new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId, year },
      include: { leaveType: true },
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
    });

    return leaveTypes.map((lt) => {
      const balance = balances.find((b) => b.leaveTypeId === lt.id);
      const totalEntitled = Number(balance?.totalEntitled ?? 0);
      const carryForward = Number(balance?.carryForward ?? 0);
      const totalUsed = Number(balance?.totalUsed ?? 0);
      const totalPending = Number(balance?.totalPending ?? 0);

      return {
        leaveType: { id: lt.id, code: lt.code, name: lt.name },
        totalEntitled,
        totalUsed,
        totalPending,
        carryForward,
        available: totalEntitled + carryForward - totalUsed - totalPending,
      };
    });
  }

  private async getUpcomingSchedule(tenantId: string, employeeId: string, today: Date) {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    const entries = await this.prisma.rosterEntry.findMany({
      where: {
        employeeId,
        date: { gte: today, lte: endDate },
      },
      include: { shift: true },
      orderBy: { date: 'asc' },
    });

    return entries;
  }

  private async getRecentPayslips(tenantId: string, employeeId: string) {
    return this.prisma.payslip.findMany({
      where: { tenantId, employeeId, run: { status: 'APPROVED' as any } },
      include: {
        run: { include: { period: { select: { id: true, name: true } } } },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  private async getRecentNotifications(tenantId: string, employeeId: string) {
    return this.prisma.essNotification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private async getPendingApprovalsCount(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);

    const departmentIds = employee?.employments.map((e: { departmentId: string }) => e.departmentId) || [];

    const subordinateIds = (
      await this.employeeService.findSubordinates(tenantId, departmentIds, employeeId)
    ).map((s) => s.id);

    if (subordinateIds.length === 0) return { total: 0, leaveRequests: 0, corrections: 0 };

    const [leaveRequests, corrections] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: {
          tenantId,
          employeeId: { in: subordinateIds },
          status: 'PENDING' as any,
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          tenantId,
          employeeId: { in: subordinateIds },
          isApproved: false,
        },
      }),
    ]);

    return { total: leaveRequests + corrections, leaveRequests, corrections };
  }

  private async getEmployeeK3Profile(tenantId: string, employeeId: string) {
    const completedTrainings = await this.prisma.trainingParticipant.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
        training: { tenantId, category: 'K3' },
      },
      include: { training: { select: { id: true, title: true, startDate: true } } },
      orderBy: { completedAt: 'desc' },
    });

    const activePpe = await this.prisma.ppeAssignment.findMany({
      where: { tenantId, employeeId, status: 'ACTIVE', deletedAt: null },
    });

    const activeSp = await this.prisma.disciplinaryCase.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: ['APPROVED', 'ACKNOWLEDGED'] as any },
        validUntil: { gte: new Date() },
        deletedAt: null,
      },
      orderBy: { spLevel: 'desc' },
    });

    return {
      completedK3Trainings: completedTrainings.length,
      activePpeCount: activePpe.length,
      activeSp: activeSp ? { spLevel: activeSp.spLevel, description: activeSp.description } : null,
      recentTrainings: completedTrainings.slice(0, 3).map((tp) => tp.training),
    };
  }
}
