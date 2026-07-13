import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { AuthzService } from './authz.service';

/**
 * Endpoint publik-internal /authz/check (bukan di bawah prefix /admin)
 * sesuai Consolidated API & Event Contract. Dipertahankan sebagai HTTP
 * endpoint eksplisit — meskipun saat ini dipanggil in-process via
 * AuthzGuard — agar kontraknya identik saat modul lain diekstrak jadi
 * microservice terpisah (Technical Architecture Document, Bagian 10).
 */
@ApiTags('authz')
@Controller('authz')
export class AuthzController {
  constructor(private readonly authzService: AuthzService) {}

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Validasi permission user (dipanggil seluruh modul, internal service-to-service)' })
  async check(
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
    @Query('module') module: string,
    @Query('action') action: string,
  ): Promise<{ allowed: boolean }> {
    const allowed = await this.authzService.check({ userId, tenantId, module, action });
    return { allowed };
  }
}
