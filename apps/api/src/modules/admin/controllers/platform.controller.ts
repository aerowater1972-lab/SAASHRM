import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Platform Operations')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/platform')
export class PlatformController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @Permissions('admin:branding:read')
  @ApiOperation({ summary: 'System health snapshot (Platform Operations)' })
  async getHealth(@TenantId() tenantId: string) {
    const latest = await this.prisma.systemHealthSnapshot.findFirst({
      where: { tenantId },
      orderBy: { snapshotAt: 'desc' },
    });
    return latest ?? { tenantId, status: 'no_data', message: 'No health snapshots yet' };
  }

  @Post('health/ping')
  @Permissions('admin:branding:read')
  @ApiOperation({ summary: 'Create a health snapshot (simulated)' })
  async pingHealth(@TenantId() tenantId: string) {
    const snapshot = await this.prisma.systemHealthSnapshot.create({
      data: {
        tenantId,
        cpuUsage: Math.round(Math.random() * 80 + 5),
        memoryUsedMb: Math.round(Math.random() * 2048 + 512),
        memoryTotalMb: 4096,
        diskUsedMb: Math.round(Math.random() * 50000 + 10000),
        diskTotalMb: 100000,
        uptimeSeconds: Math.floor(process.uptime()),
        activeUsers: Math.floor(Math.random() * 10 + 1),
        apiLatencyMs: Math.round(Math.random() * 150 + 10),
        errorRate: Math.round(Math.random() * 2 * 100) / 100,
      },
    });
    return snapshot;
  }
}
