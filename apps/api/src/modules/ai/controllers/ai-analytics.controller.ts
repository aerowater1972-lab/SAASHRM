import { Controller, Get, Post, Query, Param, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { AIAnalyticsService } from '../services/ai-analytics.service';

/**
 * AI Analytics — Ekspos endpoint prediksi & penjelasan disengagement (gap AI).
 * Run: POST /ai/retrain untuk retraining manual (ai:manage).
 */
@ApiTags('AI Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ai')
export class AiAnalyticsController {
  constructor(private readonly ai: AIAnalyticsService) {}

  @Get('disengagement')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Daftar karyawan dengan risiko disengagement (top N)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah hasil (1-100)', type: Number })
  async listDisengagement(@TenantId() tenantId: string, @Query() query: { limit?: string }) {
    const limit = query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20;
    return this.ai.predictDisengagement(tenantId, limit);
  }

  @Get('disengagement/:employeeId')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Risiko disengagement per karyawan' })
  async detailDisengagement(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.ai.predictDisengagementSingle(tenantId, employeeId);
  }

  @Get('readiness')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Daftar karyawan yang siap / perlu promosi (top N)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah hasil (1-100)', type: Number })
  async listReadiness(@TenantId() tenantId: string, @Query() query: { limit?: string }) {
    const limit = query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20;
    return this.ai.predictPromotionReadiness(tenantId, limit);
  }

  @Get('readiness/:employeeId')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Readiness promosi per karyawan' })
  async detailReadiness(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.ai.predictPromotionReadinessSingle(tenantId, employeeId);
  }

  @Get('explain/:employeeId')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Penjelasan berbayar (kontribusi fitur) kenapa karyawan berisiko disengaged' })
  async explainDisengagement(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.ai.explainDisengagement(tenantId, employeeId);
  }

  @Get('drift')
  @Permissions('ai:view')
  @ApiOperation({ summary: 'Monitoring drift fitur (PSI 90 vs 180 hari lalu)' })
  async listDrift(@TenantId() tenantId: string) {
    return this.ai.checkDrift(tenantId, 90);
  }

  @Post('notify-high-risk')
  @Permissions('ai:manage')
  @ApiOperation({ summary: 'AI-07: kirim notifikasi high-risk ke HR admin (idempoten 24 jam)' })
  async notifyHighRisk(@TenantId() tenantId: string) {
    return { sent: await this.ai.notifyHighRisk(tenantId) };
  }

  @Post('retrain')
  @Permissions('ai:manage')
  @ApiOperation({ summary: 'Retraining job: re-fit Isolation Forest + ambil modelVersion' })
  async retrainJob(@TenantId() tenantId: string) {
    return this.ai.retrainJob(tenantId);
  }
}
