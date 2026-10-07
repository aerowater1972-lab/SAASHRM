import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { BulkImportDto } from '../dto/bulk-import.dto';
import { BulkImportService } from '../services/bulk-import.service';

@ApiTags('Admin - Bulk Import')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/import')
export class BulkImportController {
  constructor(private readonly svc: BulkImportService) {}

  @Post('employees')
  @Permissions('admin:user:create')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Bulk import employees from CSV rows' })
  @HttpCode(HttpStatus.OK)
  async bulkImportEmployees(
    @TenantId() tenantId: string,
    @Body() dto: BulkImportDto,
  ): Promise<any> {
    return this.svc.bulkImportEmployees(tenantId, dto);
  }
}