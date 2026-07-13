import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Performance - Calibration')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('performance/calibrations')
export class CalibrationController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a calibration session' })
  async create(@TenantId() tenantId: string, @CurrentUser('sub') createdBy: string, @Body() dto: any) {
    return this.prisma.calibrationSession.create({
      data: {
        reviewCycleId: dto.reviewCycleId,
        departmentId: dto.departmentId,
        facilitatorId: dto.facilitatorId,
        status: dto.status || 'scheduled',
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List calibration sessions' })
  async findAll(@TenantId() tenantId: string, @Query('reviewCycleId') reviewCycleId?: string) {
    return this.prisma.calibrationSession.findMany({
      where: { ...(reviewCycleId && { reviewCycleId }), cycle: { tenantId } } as any,
      include: { cycle: true, department: true, facilitator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calibration session by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.calibrationSession.findFirst({
      where: { id, cycle: { tenantId } } as any,
      include: { cycle: true, department: true, facilitator: true },
    });
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize calibration session' })
  async finalize(@TenantId() tenantId: string, @Param('id') id: string) {
    const session = await this.prisma.calibrationSession.findFirst({
      where: { id, cycle: { tenantId } } as any,
    });
    if (!session) throw new NotFoundException('Calibration session not found');
    return this.prisma.calibrationSession.update({
      where: { id },
      data: { status: 'finalized' },
    });
  }
}
