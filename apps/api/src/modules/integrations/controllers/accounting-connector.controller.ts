import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountingConnectorService } from '../services/accounting-connector.service';

@ApiTags('Integrations - Accounting Connectors')
@Controller('integrations/accounting')
export class AccountingConnectorController {
  constructor(private readonly connectorService: AccountingConnectorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new accounting connector' })
  async createConnector(
    @Query('tenantId') tenantId: string,
    @Body() data: {
      name: string;
      type: 'JURNAL' | 'XERO' | 'ACCURATE' | 'QUICKBOOKS' | 'CUSTOM';
      credentials: any;
      config?: any;
      syncPayroll?: boolean;
      syncExpense?: boolean;
      syncAsset?: boolean;
    },
  ) {
    return this.connectorService.createConnector(tenantId, data);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounting connectors for tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getConnectors(@Query('tenantId') tenantId: string) {
    return this.connectorService.getConnectors(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get connector details with sync logs' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getConnector(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.connectorService.getConnector(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update connector configuration' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async updateConnector(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() data: {
      name?: string;
      credentials?: any;
      config?: any;
      syncPayroll?: boolean;
      syncExpense?: boolean;
      syncAsset?: boolean;
      status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    },
  ) {
    return this.connectorService.updateConnector(tenantId, id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async deleteConnector(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.connectorService.deleteConnector(tenantId, id);
  }

  @Post(':id/sync/payroll')
  @ApiOperation({ summary: 'Sync payroll run to accounting system' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'payrollRunId', required: true })
  async syncPayroll(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('payrollRunId') payrollRunId: string,
  ) {
    return this.connectorService.syncPayrollRun(tenantId, id, payrollRunId);
  }

  @Post(':id/sync/expense')
  @ApiOperation({ summary: 'Sync expense claims to accounting system' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async syncExpense(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() data: { expenseClaimIds: string[] },
  ) {
    return this.connectorService.syncExpenseClaims(tenantId, id, data.expenseClaimIds);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Test connection to accounting system' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async healthCheck(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.connectorService.healthCheck(tenantId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get sync logs' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'syncType', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getSyncLogs(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('syncType') syncType?: string,
    @Query('status') status?: string,
  ) {
    return this.connectorService.getSyncLogs(tenantId, id, {
      page,
      limit,
      syncType,
      status,
    });
  }

  @Post('chart-of-accounts/template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get chart of accounts template for Indonesian accounting' })
  getChartOfAccountsTemplate() {
    return {
      accounts: [
        // Assets (1-xxxx)
        { code: '1-1000', name: 'Kas', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-1100', name: 'Bank BCA', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-1200', name: 'Bank Mandiri', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-1300', name: 'Bank BRI', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-1400', name: 'Bank BNI', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-1500', name: 'Bank Lainnya', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-2000', name: 'Piutang Usaha', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-2100', name: 'Piutang Karyawan', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-3000', name: 'Persediaan', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-4000', name: 'Biaya Dibayar Dimuka', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-5000', name: 'Pajak Dibayar Dimuka', type: 'ASSET', category: 'CURRENT_ASSET' },
        { code: '1-6000', name: 'Aset Tetap', type: 'ASSET', category: 'FIXED_ASSET' },
        { code: '1-6100', name: 'Akumulasi Penyusutan', type: 'ASSET', category: 'FIXED_ASSET', isContra: true },

        // Liabilities (2-xxxx)
        { code: '2-1000', name: 'Hutang Usaha', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-1100', name: 'Hutang Pajak', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2000', name: 'Hutang Gaji', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2100', name: 'Hutang BPJS Kesehatan', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2200', name: 'Hutang BPJS Ketenagakerjaan', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2300', name: 'Hutang PPh 21', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2400', name: 'Hutang THR', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2500', name: 'Hutang PHK/Pesangon', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { code: '2-2900', name: 'Hutang Lain-lain', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },

        // Equity (3-xxxx)
        { code: '3-1000', name: 'Modal Disetor', type: 'EQUITY', category: 'EQUITY' },
        { code: '3-2000', name: 'Laba/Rugi Tahun Berjalan', type: 'EQUITY', category: 'EQUITY' },
        { code: '3-3000', name: 'Saldo Laba', type: 'EQUITY', category: 'EQUITY' },

        // Revenue (4-xxxx)
        { code: '4-1000', name: 'Pendapatan Jasa', type: 'REVENUE', category: 'OPERATING_REVENUE' },
        { code: '4-2000', name: 'Pendapatan Produk', type: 'REVENUE', category: 'OPERATING_REVENUE' },
        { code: '4-9000', name: 'Pendapatan Lain-lain', type: 'REVENUE', category: 'NON_OPERATING_REVENUE' },

        // Expenses (5-xxxx, 6-xxxx)
        { code: '5-1000', name: 'HPP (Cost of Goods Sold)', type: 'EXPENSE', category: 'COGS' },
        { code: '6-1000', name: 'Beban Gaji dan Upah', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-1100', name: 'Beban Tunjangan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-1200', name: 'Beban THR', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-1300', name: 'Beban BPJS Kesehatan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-1400', name: 'Beban BPJS Ketenagakerjaan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-1500', name: 'Beban PPh 21 Dibayar Perusahaan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2000', name: 'Beban Operasional', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2100', name: 'Beban Transport', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2200', name: 'Beban Makan/Makanan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2300', name: 'Beban Akomodasi', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2400', name: 'Beban ATK', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2500', name: 'Beban Komunikasi', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2600', name: 'Beban Pelatihan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2700', name: 'Beban Hiburan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-2800', name: 'Beban Medis', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-3000', name: 'Beban Sewa', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-4000', name: 'Beban Listrik/Air/Internet', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-5000', name: 'Beban Penyusutan', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-6000', name: 'Beban Asuransi', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-7000', name: 'Beban Pajak', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { code: '6-8000', name: 'Beban Bunga', type: 'EXPENSE', category: 'FINANCIAL_EXPENSE' },
        { code: '6-9000', name: 'Beban Lain-lain', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },

        // Other
        { code: '7-1000', name: 'Pendapatan Bunga', type: 'REVENUE', category: 'NON_OPERATING_REVENUE' },
        { code: '7-2000', name: 'Selisih Kurs', type: 'REVENUE', category: 'NON_OPERATING_REVENUE' },
        { code: '8-1000', name: 'Pajak Penghasilan', type: 'EXPENSE', category: 'TAX_EXPENSE' },
      ],
      description: 'Standard Indonesian Chart of Accounts (PSAK-based) for payroll integration',
    };
  }
}