import { Controller, Get, Post, Query, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditFilterDto } from '../dto/audit-filter.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
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
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Internal endpoint to ingest audit log entries' })
  ingest(
    @TenantId() tenantId: string,
    @Body() data: {
      module: string;
      entity: string;
      entityId: string;
      action: string;
      changedBy: string;
      oldValue?: Record<string, any>;
      newValue?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
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
