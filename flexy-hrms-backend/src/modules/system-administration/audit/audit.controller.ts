import { Body, Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthzGuard } from '@common/guards/authz.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { AuditService } from './audit.service';
import { IngestAuditLogDto } from './dto/ingest-audit-log.dto';

@ApiTags('audit-logs')
@Controller('admin/audit-logs')
@UseGuards(AuthzGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Endpoint internal service-to-service (BUKAN untuk dipanggil dari UI).
   * Dilindungi otentikasi service-level terpisah di production (mis. mTLS
   * atau service token) — lihat System Administration v1.1 Addendum
   * Bagian 2. Guard permission di sini tetap dipasang sebagai lapisan
   * kedua untuk konteks dalam-monolith saat ini.
   */
  @Post('ingest')
  @Public() // TODO production: ganti dengan service-level auth (mTLS/service token), lihat komentar di atas class.
  @ApiOperation({ summary: 'Ingest event *.data.changed dari modul manapun (internal-only)' })
  async ingest(@Body() dto: IngestAuditLogDto) {
    return this.auditService.ingest(dto);
  }

  @Get()
  @RequirePermission({ module: 'audit_log', action: 'read' })
  @ApiOperation({ summary: 'Mencari audit log (Compliance Officer, read-only)' })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: string,
    @Query('changedBy') changedBy?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.search({
      tenantId: user.tenantId,
      module,
      changedBy,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('export')
  @RequirePermission({ module: 'audit_log', action: 'read' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  @ApiOperation({ summary: 'Ekspor hasil pencarian audit log ke CSV' })
  async export(@CurrentUser() user: AuthenticatedUser, @Query('module') module?: string) {
    return this.auditService.exportAsCsv({ tenantId: user.tenantId, module });
  }
}
