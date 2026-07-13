import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateOvertimeDto } from '../dto/create-overtime.dto';
import { PayrollPeriodStatus, Prisma, RequestStatus } from '@prisma/client';

@Injectable()
export class OvertimeService {
  private readonly overtimeMinMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.overtimeMinMinutes = this.config.get<number>('OVERTIME_MIN_MINUTES', 30);
  }

  async createRequest(tenantId: string, employeeId: string, dto: CreateOvertimeDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const totalMinutes = dto.totalMinutes ?? Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    if (totalMinutes < this.overtimeMinMinutes) {
      throw new BadRequestException(`Overtime minimum is ${this.overtimeMinMinutes} minutes`);
    }

    return this.prisma.overtimeRequest.create({
      data: {
        tenantId,
        employeeId,
        date: new Date(dto.date),
        startTime,
        endTime,
        totalMinutes,
        reason: dto.reason,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async findAllRequests(tenantId: string, filters: { employeeId?: string; status?: RequestStatus; startDate?: string; endDate?: string }) {
    const where: Prisma.OvertimeRequestWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    return this.prisma.overtimeRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRequest(tenantId: string, id: string) {
    const request = await this.prisma.overtimeRequest.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, employments: { include: { department: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    return request;
  }

  async approveOrReject(tenantId: string, id: string, approverId: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    const request = await this.findOneRequest(tenantId, id);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Overtime request is not in PENDING status');
    }

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes,
      },
    });
  }

  async getSummary(tenantId: string, employeeId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const requests = await this.prisma.overtimeRequest.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: start, lte: end },
        status: RequestStatus.APPROVED,
      },
      orderBy: { date: 'asc' },
    });

    const totalMinutes = requests.reduce((sum, r) => sum + r.totalMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      employeeId,
      period: { startDate, endDate },
      totalMinutes,
      totalHours,
      remainingMinutes,
      totalRequests: requests.length,
      requests,
    };
  }
}
