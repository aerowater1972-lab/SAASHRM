import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProfileService } from '../services/profile.service';

class ReviewDto {
  note?: string;
}

@ApiTags('ESS - Profile Change Requests (HR Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/profile-change-requests')
export class ProfileChangeRequestController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @Permissions('employee:update')
  @ApiOperation({ summary: 'List sensitive profile change requests (BR-02)' })
  list(@TenantId() tenantId: string, @Body() body?: { status?: string }) {
    return this.profileService.listChangeRequests(tenantId, body?.status);
  }

  @Post(':id/approve')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Approve a sensitive profile change (BR-02)' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') reviewedBy: string,
    @Body() dto: ReviewDto,
  ) {
    return this.profileService.reviewChangeRequest(tenantId, id, reviewedBy, true, dto?.note);
  }

  @Post(':id/reject')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Reject a sensitive profile change (BR-02)' })
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') reviewedBy: string,
    @Body() dto: ReviewDto,
  ) {
    return this.profileService.reviewChangeRequest(tenantId, id, reviewedBy, false, dto?.note);
  }
}
