import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { calendarMonthsBetween } from '@modules/shared/utils/wage-base.util';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveFilterDto } from '../dto/leave-filter.dto';
import {
  Prisma,
  RequestStatus,
  AttendanceStatus,
  EmploymentType,
  LeaveRequest,
} from '@prisma/client';

// Addendum Serikat Pekerja BR-02: fitur aktif hanya bila feature flag ini ON.
const LABOR_UNION_FEATURE = 'labor_union';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  async createLeaveType(tenantId: string, dto: CreateLeaveTypeDto) {
    const existing = await this.prisma.leaveType.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Leave type code already exists');
    }

    return this.prisma.leaveType.create({
      data: { tenantId, ...dto },
    });
  }

  async findAllLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateLeaveType(tenantId: string, id: string, dto: Partial<CreateLeaveTypeDto>) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return this.prisma.leaveType.update({
      where: { id },
      data: dto,
    });
  }

  async getBalances(tenantId: string, employeeId: string, year?: number) {    const targetYear = year ?? new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId, year: targetYear },
      include: { leaveType: true },
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
    });

    const result = leaveTypes.map((lt) => {
      const balance = balances.find((b) => b.leaveTypeId === lt.id);
      return {
        leaveType: lt,
        totalEntitled: balance?.totalEntitled ?? 0,
        totalUsed: balance?.totalUsed ?? 0,
        totalPending: balance?.totalPending ?? 0,
        carryForward: balance?.carryForward ?? 0,
        available: Number(balance?.totalEntitled ?? 0) + Number(balance?.carryForward ?? 0) - Number(balance?.totalUsed ?? 0) - Number(balance?.totalPending ?? 0),
      };
    });

    return result;
  }

  /**
   * Cuti panjang / cuti besar (UU 13/2003 Art 79): masa kerja terus-menerus
   * >= 6 tahun -> hak istirahat >= 2 bulan (diambil 2 x 30 hari kalender).
   * Mengembalikan status kelayakan + sisa hak (terpakai = request APPROVED
   * pada jenis cuti berkode LONG). Bila tenant belum mengonfigurasi jenis
   * LONG, kelayakan tetap dilaporkan agar HR tahu langkah berikutnya.
   */
  async getLongLeaveStatus(tenantId: string, employeeId: string, asOf?: Date) {
    const LONG_LEAVE_CODE = 'LONG';
    const ENTITLED_DAYS = 60;

    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const refDate = asOf ?? new Date();
    if (!employee.startDate) {
      return { employeeId, eligible: false, reason: 'NO_START_DATE' as const };
    }

    const months = calendarMonthsBetween(new Date(employee.startDate), refDate);
    const yearsOfService = Math.floor(months / 12);
    if (yearsOfService < 6) {
      return { employeeId, eligible: false, yearsOfService, reason: 'UNDER_6_YEARS' as const };
    }

    const longType = await this.prisma.leaveType.findFirst({
      where: { tenantId, code: LONG_LEAVE_CODE, isActive: true },
    });
    if (!longType) {
      return {
        employeeId,
        eligible: true,
        yearsOfService,
        entitledDays: ENTITLED_DAYS,
        reason: 'TYPE_NOT_CONFIGURED' as const,
      };
    }

    const used = await this.prisma.leaveRequest.findMany({
      where: { tenantId, employeeId, leaveTypeId: longType.id, status: RequestStatus.APPROVED },
      select: { totalDays: true },
    });
    const usedDays = used.reduce((s, r) => s + Number(r.totalDays), 0);

    return {
      employeeId,
      eligible: true,
      yearsOfService,
      leaveTypeId: longType.id,
      entitledDays: ENTITLED_DAYS,
      usedDays,
      remainingDays: Math.max(0, ENTITLED_DAYS - usedDays),
    };
  }

  async applyCarryForward(tenantId: string, fromYear: number, toYear: number) {
    const balances = await this.prisma.leaveBalance.findMany({
      where: { tenantId, year: fromYear },
      include: { leaveType: true },
    });

    const results: Array<{ employeeId: string; leaveTypeId: string; year: number; carryForward: number }> = [];

    for (const balance of balances) {
      const remaining =
        Number(balance.totalEntitled) +
        Number(balance.carryForward) -
        Number(balance.totalUsed) -
        Number(balance.totalPending);

      const limit = balance.leaveType?.carryForwardLimit ?? 0;
      const carried = Math.max(0, Math.min(remaining, limit));

      const existing = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: toYear,
          },
        },
      });

      if (existing) {
        const updated = await this.prisma.leaveBalance.update({
          where: { id: existing.id },
          data: { carryForward: carried },
        });
        results.push({
          employeeId: updated.employeeId,
          leaveTypeId: updated.leaveTypeId,
          year: updated.year,
          carryForward: Number(updated.carryForward),
        });
      } else {
        const created = await this.prisma.leaveBalance.create({
          data: {
            tenantId,
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: toYear,
            totalEntitled: 0,
            carryForward: carried,
            totalUsed: 0,
            totalPending: 0,
          },
        });
        results.push({
          employeeId: created.employeeId,
          leaveTypeId: created.leaveTypeId,
          year: created.year,
          carryForward: Number(created.carryForward),
        });
      }
    }

    return results;
  }

  async createLeaveRequest(tenantId: string, employeeId: string, dto: CreateLeaveRequestDto) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, tenantId, isActive: true },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found or inactive');
    }

    // Addendum Serikat Pekerja BR-01/BR-02: izin kegiatan serikat hanya untuk
    // union officer dan hanya bila feature flag labor_union aktif.
    if (leaveType.isUnionActivity) {
      const enabled = await this.isLaborUnionEnabled(tenantId);
      if (!enabled) {
        throw new BadRequestException(
          'Fitur serikat pekerja tidak aktif untuk tenant ini (feature flag labor_union).',
        );
      }
      const employee = await this.employeeService.findById(tenantId, employeeId);
      if (employee?.unionStatus !== 'OFFICER') {
        throw new BadRequestException(
          'Izin Kegiatan Serikat hanya dapat diajukan oleh pengurus serikat (union officer).',
        );
      }
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    if (leaveType.maxConsecutiveDays) {
      const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      if (diffDays > leaveType.maxConsecutiveDays) {
        throw new BadRequestException(`Maximum ${leaveType.maxConsecutiveDays} consecutive days allowed for ${leaveType.name}`);
      }
    }

    if (leaveType.minServiceMonths) {
      const employee = await this.employeeService.findById(tenantId, employeeId);

      if (employee?.startDate) {
        const serviceMonths = this.monthDiff(employee.startDate, new Date());
        if (serviceMonths < leaveType.minServiceMonths) {
          throw new BadRequestException(`Minimum ${leaveType.minServiceMonths} months of service required`);
        }
      }
    }

    const totalDays = dto.totalDays ?? this.calculateWorkingDays(startDate, endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const isUrgent = startDay.getTime() <= tomorrow.getTime();

    // Addendum v1.2 FR-17 + BR-11: izin non-deducting tidak memotong saldo leave_balances
    const deductsBalance = leaveType.isBalanceDeducting !== false;

    if (deductsBalance) {
      await this.validateBalance(tenantId, employeeId, dto.leaveTypeId, totalDays, leaveType.allowNegativeBalance);
    }

    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlapping) {
      throw new ConflictException('Leave request overlaps with an existing request');
    }

    // Addendum v1.2 BR-13: izin sekali-pakai per kejadian — cek duplikasi kejadian yang sama
    if (!deductsBalance && dto.eventRef) {
      const duplicate = await this.prisma.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId,
          leaveTypeId: dto.leaveTypeId,
          eventRef: dto.eventRef,
          status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
        },
      });
      if (duplicate) {
        throw new ConflictException('Izin untuk kejadian yang sama sudah pernah diajukan');
      }
    }

    // Addendum v1.2 FR-19: Cuti Haid (sameDayApproval) langsung disetujui tanpa pre-approval
    const autoApprove = leaveType.sameDayApproval === true;

    const request = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: dto.reason,
        documentUrl: dto.documentUrl,
        isUrgent,
        eventRef: dto.eventRef,
        status: autoApprove ? RequestStatus.APPROVED : RequestStatus.PENDING,
        approvedAt: autoApprove ? new Date() : null,
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    if (deductsBalance) {
      await this.updatePendingBalance(tenantId, employeeId, dto.leaveTypeId, totalDays, 'increment');
    }

    await this.eventBus.publish({
      name: 'leave.requested',
      aggregateId: request.id,
      aggregateType: 'LeaveRequest',
      payload: { employeeId, leaveTypeId: dto.leaveTypeId, startDate: dto.startDate, endDate: dto.endDate, totalDays },
      tenantId,
    });

    if (autoApprove) {
      await this.eventBus.publish({
        name: 'leave.approved',
        aggregateId: request.id,
        aggregateType: 'LeaveRequest',
        payload: { employeeId, leaveTypeId: dto.leaveTypeId, autoApproved: true },
        tenantId,
      });
    }

    return request;
  }

  async findAllRequests(tenantId: string, filters: LeaveFilterDto): Promise<LeaveRequest[] | Paginated<LeaveRequest>> {
    const where: Prisma.LeaveRequestWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    const term = filters.q ?? filters.search;
    if (term) {
      where.OR = [
        { employee: { fullName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.leaveRequest,
      {
        where,
        include: {
          leaveType: true,
          employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOneRequest(tenantId: string, id: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: {
        leaveType: true,
        employee: { select: { id: true, employeeId: true, fullName: true, email: true, employments: { include: { department: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    return request;
  }

  async cancelRequest(tenantId: string, id: string, employeeId: string) {
    const request = await this.findOneRequest(tenantId, id);

    if (request.employeeId !== employeeId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    this.workflow.transition('leave', request.status, 'CANCEL');

    await this.updatePendingBalance(tenantId, employeeId, request.leaveTypeId, Number(request.totalDays), 'decrement');

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: RequestStatus.CANCELLED },
    });
  }

  async approveRequest(tenantId: string, id: string, approverId: string, notes?: string) {
    const request = await this.findOneRequest(tenantId, id);

    if (request.isUrgent && !request.escalated) {
      throw new BadRequestException(
        'Urgent leave (H-1/same-day) requires escalation before approval (BR-04)',
      );
    }

    const transition = this.workflow.transition('leave', request.status, 'APPROVE');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    const year = request.startDate.getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } },
    });

    if (balance) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          totalUsed: { increment: request.totalDays },
          totalPending: { decrement: request.totalDays },
        },
      });
    }

    const dayDiff = Math.floor((request.endDate.getTime() - request.startDate.getTime()) / 86400000) + 1;
    for (let i = 0; i < dayDiff; i++) {
      const date = new Date(request.startDate);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      await this.prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: request.employeeId, date } },
        create: {
          tenantId,
          employeeId: request.employeeId,
          date,
          status: AttendanceStatus.LEAVE,
        },
        update: { status: AttendanceStatus.LEAVE },
      });
    }

    if (notes) {
      await this.prisma.leaveRequest.update({
        where: { id },
        data: { reason: `${request.reason} | Approval note: ${notes}` },
      });
    }

    await this.eventBus.publish({
      name: 'leave.approved',
      aggregateId: id,
      aggregateType: 'LeaveRequest',
      payload: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, startDate: request.startDate, endDate: request.endDate, approverId },
      tenantId,
    });

    return updated;
  }

  async escalateRequest(tenantId: string, id: string, escalatedBy: string) {
    const request = await this.findOneRequest(tenantId, id);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Cannot escalate a ${request.status} leave request`);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { escalated: true },
    });
  }

  async rejectRequest(tenantId: string, id: string, approverId: string, reason: string) {
    const request = await this.findOneRequest(tenantId, id);

    const transition = this.workflow.transition('leave', request.status, 'REJECT');

    await this.updatePendingBalance(tenantId, request.employeeId, request.leaveTypeId, Number(request.totalDays), 'decrement');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    await this.eventBus.publish({
      name: 'leave.rejected',
      aggregateId: id,
      aggregateType: 'LeaveRequest',
      payload: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, reason },
      tenantId,
    });

    return updated;
  }

  async getPendingApprovals(tenantId: string, approverId: string) {
    const employee = await this.employeeService.findById(tenantId, approverId);

    const departmentIds = employee?.employments.map((e: { departmentId: string }) => e.departmentId) || [];

    const subordinateIds = (
      await this.employeeService.findSubordinates(tenantId, departmentIds, approverId)
    ).map((s) => s.id);

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: subordinateIds },
        status: RequestStatus.PENDING,
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return requests;
  }

  async getTeamCalendar(tenantId: string, managerId: string, startDate?: string, endDate?: string) {
    const employee = await this.employeeService.findById(tenantId, managerId);

    const departmentIds = employee?.employments.map((e: { departmentId: string }) => e.departmentId) || [];

    const where: Prisma.LeaveRequestWhereInput = {
      tenantId,
      status: RequestStatus.APPROVED,
      employee: {
        employments: {
          some: {
            departmentId: { in: departmentIds },
            isActive: true,
          },
        },
      },
    };

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.endDate = { lte: new Date(endDate) };
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const holidays = await this.prisma.holidayCalendar.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
          lte: endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31),
        },
      },
      orderBy: { date: 'asc' },
    });

    return { leaves: requests, holidays };
  }

  private async isLaborUnionEnabled(tenantId: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature: LABOR_UNION_FEATURE },
    });
    return Boolean(flag?.enabled);
  }

  private async validateBalance(tenantId: string, employeeId: string, leaveTypeId: string, totalDays: number, allowNegative: boolean) {
    const year = new Date().getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    });

    if (!balance && !allowNegative) {
      throw new BadRequestException('No leave balance found for this leave type');
    }

    if (balance && !allowNegative) {
      const available = Number(balance.totalEntitled) + Number(balance.carryForward) - Number(balance.totalUsed) - Number(balance.totalPending);
      if (totalDays > available) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
      }
    }
  }

  private async updatePendingBalance(tenantId: string, employeeId: string, leaveTypeId: string, totalDays: number, action: 'increment' | 'decrement') {
    const year = new Date().getFullYear();

    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    });

    if (balance) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          totalPending: action === 'increment' ? { increment: totalDays } : { decrement: totalDays },
        },
      });
    }
  }

  private calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }

    return count || 1;
  }

  private monthDiff(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  }
}
