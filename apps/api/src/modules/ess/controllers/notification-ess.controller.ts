import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('ESS - Notifications')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/notifications')
export class NotificationEssController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async findAll(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.prisma.essNotification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    const count = await this.prisma.essNotification.count({
      where: { employeeId, readStatus: false },
    });
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser('employeeId') employeeId: string) {
    return this.prisma.essNotification.updateMany({
      where: { id, employeeId },
      data: { readStatus: true },
    });
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('employeeId') employeeId: string) {
    await this.prisma.essNotification.updateMany({
      where: { employeeId, readStatus: false },
      data: { readStatus: true },
    });
    return { success: true };
  }
}
