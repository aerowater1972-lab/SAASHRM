import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { SkipCsrf } from '@common/decorators/skip-csrf.decorator';
import { CareerPortalService } from '../services/career-portal.service';

// Portal publik: tanpa JWT/CSRF (diakses pelamar anonim). Apply dibatasi
// throttle ketat anti-spam; listing longgar.
@ApiTags('Recruitment - Career Portal (Public)')
@Controller('careers/:tenantId')
export class CareerPortalController {
  constructor(private readonly portal: CareerPortalService) {}

  @Get('jobs')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Lowongan published (publik, tanpa data internal)' })
  @ApiParam({ name: 'tenantId', description: 'ID tenant perusahaan' })
  listJobs(@Param('tenantId') tenantId: string) {
    return this.portal.listJobs(tenantId);
  }

  @Get('jobs/:jobId')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Detail lowongan published' })
  getJob(@Param('tenantId') tenantId: string, @Param('jobId') jobId: string) {
    return this.portal.getJob(tenantId, jobId);
  }

  @Post('jobs/:jobId/apply')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Lamar lowongan (maks 5/jam per IP)' })
  apply(
    @Param('tenantId') tenantId: string,
    @Param('jobId') jobId: string,
    @Body() data: {
      firstName: string; lastName: string; email: string; phone?: string;
      resumeUrl?: string; currentCompany?: string; currentPosition?: string;
      expectedSalary?: number; coverNote?: string;
    },
  ) {
    return this.portal.apply(tenantId, jobId, data);
  }
}
