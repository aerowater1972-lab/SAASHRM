import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

// ESS payroll self-service: THR & pesangon milik sendiri.
// Memakai ulang ess:payslip:read (layanan mandiri payroll) agar tak
// menambah matriks permission baru untuk data yang memang milik pemohon.
@ApiTags('ESS - Payroll (THR & Pesangon)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/payroll')
export class PayrollEssController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('thr-records')
  @Permissions('ess:payslip:read')
  @ApiOperation({ summary: 'THR saya (per karyawan login)' })
  thrRecords(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.prisma.thrRecord.findMany({
      where: { employeeId, run: { tenantId } },
      include: {
        run: { select: { id: true, name: true, holidayName: true, holidayDate: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('severance-cases')
  @Permissions('ess:payslip:read')
  @ApiOperation({ summary: 'Kasus pesangon saya (per karyawan login)' })
  severanceCases(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.prisma.severanceCase.findMany({
      where: { tenantId, employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
