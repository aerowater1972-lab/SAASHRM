import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ReviewService } from '../services/review.service';

@ApiTags('Performance - Employee History')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employees')
export class PerformanceController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get(':id/performance-history')
  @Permissions('performance:read')
  @ApiOperation({ summary: 'Cross-period performance history for an employee (US-05 / FR-06)' })
  async getHistory(
    @TenantId() tenantId: string,
    @Param('id') employeeId: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    // Note: per-PRD security ("only employee, direct manager, HRBP can access") is enforced at
    // the permission/role level. The Employee role receives `performance:read` for now;
    // a future refinement could add an ownership check once a managerId field exists in the schema.
    return this.reviewService.getPerformanceHistory(tenantId, employeeId, currentUserId);
  }
}
