import { Controller, Get, Post, Query, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditFilterDto } from '../dto/audit-filter.dto';
import { IngestAuditDto } from '../dto/ingest-audit.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  
        
    
  @Permissions('admin:audit:read')
  @ApiOperation({ summary: 'List audit logs with filters' })
  findAll(@TenantId() tenantId: string, @Query() filters: AuditFilterDto) {
    return this.auditService.findAll(tenantId, filters);
  }

  @Post('ingest')
  @Permissions('admin:audit:create')
  @ApiOperation({ summary: 'Internal endpoint to ingest audit log entries (FR-09a v1.1)' })
  ingest(
    @TenantId() tenantId: string,
    @Body() data: IngestAuditDto,
  ) {
    return this.auditService.ingest({ ...data, tenantId });
  }

  @Get('export')
  
        
    
  @Permissions('admin:audit:export')
  @ApiOperation({ summary: 'Export audit logs to CSV' })
  async export(
    @TenantId() tenantId: string,
    @Query() filters: AuditFilterDto,
    @Res() res: Response,
  ) {
    const csv = await this.auditService.export(tenantId, filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  }
}
