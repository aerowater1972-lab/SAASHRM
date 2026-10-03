import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { CollectiveRelationsService } from '../services/collective-relations.service';

@ApiTags('Employee Relations - Kolektif')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employee-relations/collective')
export class CollectiveRelationsController {
  constructor(private readonly collective: CollectiveRelationsService) {}

  @Post('grievances')
  @Permissions('employee-relations:grievance:create')
  @ApiOperation({ summary: 'Laporkan pengaduan pekerja (grievance)' })
  report(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: { category: string; subject: string; description: string; isConfidential?: boolean },
  ) {
    return this.collective.reportGrievance(tenantId, user?.employeeId as string, dto);
  }

  @Get('grievances')
  @Permissions('employee-relations:grievance:read')
  @ApiOperation({ summary: 'Daftar pengaduan (identitas rahasia disamarkan)' })
  list(@TenantId() tenantId: string, @CurrentUser() user: JwtUser) {
    return this.collective.listGrievances(tenantId, {
      employeeId: user?.employeeId ?? null,
      roles: user?.role ? [user.role] : [],
    });
  }

  @Put('grievances/:id/assign')
  @Permissions('employee-relations:grievance:manage')
  @ApiOperation({ summary: 'Tunjuk penangan pengaduan (bukan pelapor)' })
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('handlerUserId') handlerUserId: string,
  ) {
    return this.collective.assignGrievanceHandler(tenantId, id, handlerUserId);
  }

  @Put('grievances/:id/advance')
  @Permissions('employee-relations:grievance:manage')
  @ApiOperation({ summary: 'Majukan status pengaduan' })
  advance(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { to: string; resolution?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.collective.advanceGrievance(tenantId, id, dto.to, userId, dto.resolution);
  }

  @Post('bipartite')
  @Permissions('employee-relations:bipartite:manage')
  @ApiOperation({ summary: 'Jadwalkan pertemuan LKS Bipartit' })
  schedule(@TenantId() tenantId: string, @Body() dto: { sessionDate: string; topic: string; managementAttendees: string[]; workerAttendees: string[] }) {
    return this.collective.scheduleBipartite(tenantId, dto);
  }

  @Put('bipartite/:id/hold')
  @Permissions('employee-relations:bipartite:manage')
  @ApiOperation({ summary: 'Laksanakan pertemuan + catat notulen' })
  hold(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { minutes: string; followUps?: Array<{ task: string; owner: string; dueDate: string }> },
  ) {
    return this.collective.holdBipartite(tenantId, id, dto.minutes, dto.followUps ?? []);
  }

  @Put('bipartite/:id/close')
  @Permissions('employee-relations:bipartite:manage')
  @ApiOperation({ summary: 'Tutup pertemuan bila semua tindak lanjut selesai' })
  close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { followUps?: Array<{ task: string; owner: string; dueDate: string; done: boolean }> },
  ) {
    return this.collective.closeBipartite(tenantId, id, dto.followUps);
  }

  @Get('bipartite')
  @Permissions('employee-relations:bipartite:read')
  @ApiOperation({ summary: 'Daftar pertemuan LKS Bipartit' })
  listBipartite(@TenantId() tenantId: string) {
    return this.collective.listBipartite(tenantId);
  }
}
