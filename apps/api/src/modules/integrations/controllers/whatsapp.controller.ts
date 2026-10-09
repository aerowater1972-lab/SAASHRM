import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhatsappService, WaTemplateName } from '../services/whatsapp.service';

@ApiTags('Integrations - WhatsApp')
@Controller('integrations/whatsapp')
export class WhatsappController {
  constructor(private readonly wa: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Show active provider (CLOUD_API when env configured, else LOG)' })
  status() {
    return { provider: this.wa.provider };
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send raw text message' })
  send(@Body() data: { to: string; body: string }) {
    return this.wa.sendText(data.to, data.body);
  }

  @Post('send-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render + send a Bahasa Indonesia HR template' })
  sendTemplate(@Body() data: { to: string; template: WaTemplateName; vars: Record<string, string | number> }) {
    return this.wa.sendTemplate(data.to, data.template, data.vars ?? {});
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available templates with sample render' })
  templates(@Query('companyName') companyName?: string) {
    const vars = { employeeName: 'Budi', leaveType: 'Tahunan', startDate: '2026-11-01', endDate: '2026-11-03', totalDays: 3, reason: 'Keluarga', decision: 'DISETUJUI', note: '', companyName: companyName ?? 'PT Contoh', date: '2026-10-09', hours: 3, period: 'Oktober 2026', netPay: '8.500.000', shiftName: 'Pagi', shiftStart: '08:00', year: 2026, amount: '8.500.000', payDate: 'H-7 Lebaran', title: 'Libur Bersama', content: 'Kantor tutup...' };
    const names: WaTemplateName[] = ['leave_request', 'leave_decision', 'overtime_decision', 'payslip_ready', 'attendance_reminder', 'thr_info', 'announcement'];
    return { templates: names.map((n) => ({ name: n, sample: this.wa.renderTemplate(n, vars) })) };
  }
}
