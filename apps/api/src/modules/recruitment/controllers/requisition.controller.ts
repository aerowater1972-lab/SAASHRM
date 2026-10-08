import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateJobRequisitionDto } from '../dto/job-requisition.dto';

@ApiTags('Recruitment - Requisitions')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/requisitions')
export class RequisitionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('recruitment:requisition:create')
  @ApiOperation({ summary: 'Create job requisition (status defaults to pending_approval)' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateJobRequisitionDto) {
    return this.prisma.jobRequisition.create({ data: { ...dto, tenantId } });
  }

  @Get()
  @Permissions('recruitment:requisition:read')
  @ApiOperation({ summary: 'List job requisitions' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.jobRequisition.findMany({
      where: { tenantId },
      include: { department: true, approver: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Permissions('recruitment:requisition:read')
  @ApiOperation({ summary: 'Get requisition by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.jobRequisition.findFirst({
      where: { id, tenantId },
      include: { department: true, approver: true },
    });
  }

  @Post(':id/approve')
  @Permissions('recruitment:requisition:approve')
  @ApiOperation({ summary: 'Approve a requisition (BR-01: required before posting)' })
  async approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    const requisition = await this.prisma.jobRequisition.findFirst({ where: { id, tenantId } });
    if (!requisition) throw new BadRequestException('Requisition not found');
    if (requisition.status === 'approved') return requisition;
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: 'approved', approvedBy: user?.employeeId ?? null },
    });
  }

  @Post(':id/reject')
  @Permissions('recruitment:requisition:approve')
  @ApiOperation({ summary: 'Reject a requisition' })
  async reject(@TenantId() tenantId: string, @Param('id') id: string) {
    const requisition = await this.prisma.jobRequisition.findFirst({ where: { id, tenantId } });
    if (!requisition) throw new BadRequestException('Requisition not found');
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: 'rejected', approvedBy: null },
    });
  }

  @Put(':id/status')
  @Permissions('recruitment:requisition:update')
  @ApiOperation({ summary: 'Update non-approval requisition status (e.g. closed)' })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    // Approval/rejection must go through the dedicated endpoints so that
    // approvedBy is recorded (BR-01).
    if (dto.status === 'approved' || dto.status === 'rejected') {
      throw new BadRequestException(
        `Status '${dto.status}' is not allowed here; use the approve/reject endpoints`,
      );
    }
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
