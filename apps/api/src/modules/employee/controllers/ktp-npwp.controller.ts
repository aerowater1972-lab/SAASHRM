import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { KtpNpwpService } from '../services/ktp-npwp.service';

@ApiTags('Employee - KTP/NPWP Verification')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employee/ktp-npwp')
export class KtpNpwpController {
  constructor(private readonly ktpNpwpService: KtpNpwpService) {}

  @Post('verify')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Verifikasi KTP/NPWP karyawan (mock Dukcapil)' })
  async verify(
    @Body() dto: { employeeId: string; nik?: string; npwp?: string },
  ) {
    return this.ktpNpwpService.verifyKtpNpwp(dto.employeeId, dto.nik, dto.npwp);
  }

  @Get('status/:employeeId')
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Cek status verifikasi KTP/NPWP karyawan' })
  async getStatus(@Param('employeeId') employeeId: string) {
    // Return mock status based on format validation
    // In real implementation, this would check against DB verified status
    return {
      verificationMethod: 'INTERNAL_FORMAT_VALIDATION',
    };
  }
}