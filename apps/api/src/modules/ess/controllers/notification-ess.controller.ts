import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { EssNotificationService } from '../services/notification.service';

@ApiTags('ESS - Notifications')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/notifications')
export class NotificationEssController {
  constructor(private readonly notificationService: EssNotificationService) {}

  @Get()
  @Permissions('ess:notification:read')
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOperation({ summary: 'Get my notifications (BR-05: archived excluded by default)' })
  findAll(
    @CurrentUser('employeeId') employeeId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.notificationService.list(employeeId, includeArchived === 'true');
  }

  @Get('unread-count')
  @Permissions('ess:notification:read')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser('employeeId') employeeId: string) {
    const count = await this.notificationService.unreadCount(employeeId);
    return { count };
  }

  @Post(':id/read')
  @Permissions('ess:notification:update')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser('employeeId') employeeId: string) {
    return this.notificationService.markRead(id, employeeId);
  }

  @Post('read-all')
  @Permissions('ess:notification:update')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('employeeId') employeeId: string) {
    return this.notificationService.markAllRead(employeeId);
  }
}
