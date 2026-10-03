import { Controller, Get, Post, Put, Body, Param, Query , UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { TaxService } from '../services/tax.service';
import { CreateTaxConfigDto, TaxCalculationDto } from '../dto/tax-config.dto';
import { AnnualReconcileDto } from '../dto/annual-tax.dto';
import { GrossUpDto } from '../dto/gross-up.dto';
import { Response } from 'express';

@ApiTags('Payroll - Tax (PPh 21)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('configs')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Create tax configuration' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateTaxConfigDto) {
    return this.taxService.createConfig(tenantId, dto);
  }

  @Get('configs')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Get tax configurations' })
  getConfigs(@TenantId() tenantId: string) {
    return this.taxService.getConfigs(tenantId);
  }

  @Put('configs/:id')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Update tax configuration' })
  updateConfig(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaxConfigDto>,
  ) {
    return this.taxService.updateConfig(tenantId, id, dto);
  }

  @Post('calculate')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Calculate PPh 21 for an employee in a period' })
  calculate(@TenantId() tenantId: string, @Body() dto: TaxCalculationDto) {
    return this.taxService.calculate(tenantId, dto);
  }

  @Post('gross-up')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Cari bruto dari target neto (tunjangan pajak)' })
  grossUp(@TenantId() tenantId: string, @Body() dto: GrossUpDto) {
    return this.taxService.calculateGrossUp(tenantId, dto);
  }

  @Post('annual-reconcile')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Preview rekonsiliasi PPh21 tahunan (tanpa simpan)' })
  reconcilePreview(@TenantId() tenantId: string, @Body() dto: AnnualReconcileDto) {
    return this.taxService.calculateAnnual(tenantId, dto);
  }

  @Post('annual-finalize')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Finalisasi rekonsiliasi tahunan (simpan record FINAL)' })
  finalize(
    @TenantId() tenantId: string,
    @Body() dto: AnnualReconcileDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.taxService.finalizeAnnual(tenantId, dto, userId);
  }

  @Get('annual-a1/:employeeId/:year')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Data bukti potong 1721-A1 dari record FINAL' })
  generateA1(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
  ) {
    return this.taxService.generateA1(tenantId, employeeId, Number(year));
  }

  @Get('annual-a1/export/:employeeId/:year')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Export bukti potong 1721-A1 format CSV' })
  async exportA1(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
    @Res() res: Response,
  ) {
    const a1Data = await this.taxService.generateA1(tenantId, employeeId, Number(year));
    
    // Generate CSV content
    const csvLines: string[] = [];
    csvLines.push('FORM 1721-A1');
    csvLines.push(`TAHUN,${a1Data.year}`);
    csvLines.push('');
    csvLines.push('EMPLOYEE INFORMATION');
    csvLines.push(`NAMA,${a1Data.employee?.name || ''}`);
    csvLines.push(`NPWP,${a1Data.employee?.taxIdNumber || ''}`);
    csvLines.push(`ALAMAT,${a1Data.employee?.address || ''}`);
    csvLines.push(`KATEGORI PTKP,${a1Data.ptkpCategory}`);
    csvLines.push('');
    csvLines.push('TOTAL TAHUNAN');
    csvLines.push(`PENDAPATAN KOTOR TAHUNAN,${a1Data.totals.grossAnnual}`);
    csvLines.push(`BIAYA JABATAN,${a1Data.totals.biayaJabatan}`);
    csvLines.push(`IURAN KARYAWAN BPJS TAHUNAN,${a1Data.totals.bpjsAnnual}`);
    csvLines.push(`POTONGAN LAIN TAHUNAN,${a1Data.totals.adjustment}`);
    csvLines.push(`NETO TAHUNAN,${a1Data.totals.netAnnual}`);
    csvLines.push(`PTKP,${a1Data.totals.ptkp}`);
    csvLines.push(`PKP (Pajak Kotor Perhitungan),${a1Data.totals.pkp}`);
    csvLines.push(`PAJAK TAHUNAN,${a1Data.totals.annualTax}`);
    csvLines.push(`TOTAL TELAH DIPOTONG,${a1Data.totals.totalWithheld}`);
    csvLines.push(`ADJUSTMENT DESEMBER,${a1Data.totals.adjustment}`);
    csvLines.push('');
    csvLines.push('BULANAN');
    csvLines.push('BULAN,PENDAPATAN KOTOR,TELAH DIPOTONG PPh21');
    a1Data.monthly.forEach((m: any) => {
      csvLines.push(`${m.month},${m.gross || 0},${m.terWithheld || 0}`);
    });
    csvLines.push('');
    csvLines.push(`STATUS,${a1Data.status}`);
    csvLines.push(`TANGGAL FINALISASI,${a1Data.finalizedAt ? new Date(a1Data.finalizedAt).toLocaleDateString('id-ID') : ''}`);
    
    const csvContent = csvLines.join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bukpot-1721-A1-${a1Data.employee?.name}-${a1Data.year}.csv`);
    res.status(200).send(csvContent);
  }
}
