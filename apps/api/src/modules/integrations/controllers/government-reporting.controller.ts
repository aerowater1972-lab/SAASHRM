import { Controller, Get, Post, Delete, Body, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { GovernmentReportingService } from '../services/government-reporting.service';

@ApiTags('Integrations - Government Reporting')
@Controller('integrations/government')
export class GovernmentReportingController {
  constructor(private readonly reports: GovernmentReportingService) {}

  @Post('configs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create government report config (DJP/BPJS/SIPP)' })
  createConfig(@Query('tenantId') tenantId: string, @Body() data: any) {
    return this.reports.createConfig(tenantId, data);
  }

  @Get('configs')
  @ApiOperation({ summary: 'List report configs' })
  listConfigs(@Query('tenantId') tenantId: string) {
    return this.reports.listConfigs(tenantId);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get config with reports' })
  getConfig(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.reports.getConfig(tenantId, id);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: 'Delete report config' })
  deleteConfig(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.reports.deleteConfig(tenantId, id);
  }

  @Post('configs/:id/generate')
  @ApiOperation({ summary: 'Generate report for period' })
  generate(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() data: { periodStart: string; periodEnd: string },
  ) {
    return this.reports.generateReport(tenantId, id, new Date(data.periodStart), new Date(data.periodEnd));
  }

  @Get('reports/:id/download')
  @ApiOperation({ summary: 'Download generated CSV' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { fileName, content } = await this.reports.getReportContent(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  }

  @Post('reports/:id/validate')
  @ApiOperation({ summary: 'Validate report rows' })
  validate(@Param('id') id: string) {
    return this.reports.validateReport(id);
  }

  @Post('reports/:id/submit')
  @ApiOperation({ summary: 'Mark report as submitted (manual portal upload)' })
  submit(@Param('id') id: string, @Body() data: { submissionRef?: string }) {
    return this.reports.markSubmitted(id, data?.submissionRef);
  }

  @Post('reports/:id/accept')
  @ApiOperation({ summary: 'Mark submitted report accepted by regulator' })
  accept(@Param('id') id: string) {
    return this.reports.markAccepted(id);
  }

  @Post('reports/:id/reject')
  @ApiOperation({ summary: 'Mark submitted report rejected with reason' })
  reject(@Param('id') id: string, @Body() data: { reason: string }) {
    return this.reports.markRejected(id, data?.reason);
  }

  @Get('guides/:type')
  @ApiOperation({ summary: 'Manual submission guide (portal + steps + deadline)' })
  guide(@Param('type') type: string) {
    return this.reports.getSubmissionGuide(type as any);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Monthly compliance calendar (statutory dues + THR H-7)' })
  calendar(
    @Query('tenantId') tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.reports.getComplianceCalendar(tenantId, Number(year), Number(month));
  }
}
