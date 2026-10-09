import { Controller, Get, Post, Patch, Body, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { VendorTaxService } from '../services/vendor-tax.service';
import { CreateVendorDto, CreateVendorInvoiceDto } from '../dto/vendor-tax.dto';

@ApiTags('Expense - Vendor PPh 23/26')
@Controller('expense/vendors')
export class VendorTaxController {
  constructor(private readonly service: VendorTaxService) {}

  @Get('tax-rates')
  @ApiOperation({ summary: 'PPh 23/26 rate table (PMK-141, UU PPh 36/2008)' })
  rates() {
    return this.service.getRateTable();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create vendor (supports foreign + treaty rate)' })
  createVendor(@Query('tenantId') tenantId: string, @Body() dto: CreateVendorDto) {
    return this.service.createVendor(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  listVendors(@Query('tenantId') tenantId: string, @Query('search') search?: string) {
    return this.service.listVendors(tenantId, search);
  }

  @Get('invoices/list')
  @ApiOperation({ summary: 'List invoices with totals' })
  listInvoices(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listInvoices(tenantId, { status, vendorId, from, to, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Patch('invoices/:id/approve')
  @ApiOperation({ summary: 'Approve invoice (DRAFT -> APPROVED)' })
  approve(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.approveInvoice(tenantId, id);
  }

  @Patch('invoices/:id/pay')
  @ApiOperation({ summary: 'Mark paid (APPROVED -> PAID), optional eBupot ref' })
  pay(@Param('id') id: string, @Query('tenantId') tenantId: string, @Body() data: { ebupotRef?: string }) {
    return this.service.markPaid(tenantId, id, data?.ebupotRef);
  }

  @Patch('invoices/:id/cancel')
  @ApiOperation({ summary: 'Cancel invoice (not PAID)' })
  cancel(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.cancelInvoice(tenantId, id);
  }

  @Get('invoices/ebupot.csv')
  @ApiOperation({ summary: 'Export eBupot-ready CSV for period' })
  async exportCsv(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const { fileName, content } = await this.service.exportEbupotCsv(tenantId, from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create vendor invoice with auto withholding calc' })
  createInvoice(@Query('tenantId') tenantId: string, @Body() dto: CreateVendorInvoiceDto) {
    return this.service.createInvoice(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Vendor detail with invoices' })
  getVendor(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.getVendor(tenantId, id);
  }
}
