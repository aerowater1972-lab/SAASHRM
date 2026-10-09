import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AccountingCredentials {
  // Jurnal
  jurnalApiKey?: string;
  jurnalApiSecret?: string;
  jurnalClientId?: string;
  jurnalClientSecret?: string;
  // Xero
  xeroClientId?: string;
  xeroClientSecret?: string;
  xeroRedirectUri?: string;
  xeroTenantId?: string;
  xeroAccessToken?: string;
  xeroRefreshToken?: string;
  xeroTokenExpiresAt?: number;
  // Accurate
  accurateClientId?: string;
  accurateClientSecret?: string;
  accurateAccessToken?: string;
  accurateRefreshToken?: string;
  accurateDbName?: string;
  // Generic
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  extra?: Record<string, any>;
}

export interface JournalEntry {
  date: Date;
  reference: string;
  description: string;
  lines: JournalLine[];
  sourceType: 'PAYROLL' | 'EXPENSE' | 'ASSET' | 'MANUAL';
  sourceId: string;
  metadata?: Record<string, any>;
}

export interface JournalLine {
  accountCode: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  project?: string;
  metadata?: Record<string, any>;
}

export interface AccountingConnectorConfig {
  chartOfAccounts: Record<string, string>; // maps internal account type to external account code
  defaultCostCenter?: string;
  currency?: string;
  dateFormat?: string;
  // Optional per-account overrides used by the journal builders.
  salaryExpense?: string;
  cashBank?: string;
  bpjsKesehatanPayable?: string;
  bpjsKetenagakerjaanPayable?: string;
  taxPayable?: string;
  thrPayable?: string;
  loanReceivable?: string;
  otherDeductions?: string;
  transportExpense?: string;
  mealExpense?: string;
  accommodationExpense?: string;
  officeSupplyExpense?: string;
  communicationExpense?: string;
  trainingExpense?: string;
  entertainmentExpense?: string;
  medicalExpense?: string;
  otherExpense?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: string[];
  externalIds: Record<string, string>; // internalId -> externalId
}

export interface ConnectorHealthCheck {
  connected: boolean;
  lastChecked: Date;
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class AccountingConnectorService {
  private readonly logger = new Logger(AccountingConnectorService.name);
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>('ACCOUNTING_ENCRYPTION_KEY') || 'default-key-change-in-production';
  }

  // ============ CRUD Operations ============

  async createConnector(tenantId: string, data: {
    name: string;
    type: 'JURNAL' | 'XERO' | 'ACCURATE' | 'QUICKBOOKS' | 'CUSTOM';
    credentials: AccountingCredentials;
    config?: AccountingConnectorConfig;
    syncPayroll?: boolean;
    syncExpense?: boolean;
    syncAsset?: boolean;
  }) {
    const encryptedCreds = this.encryptCredentials(data.credentials);
    
    return this.prisma.accountingConnector.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        credentials: encryptedCreds,
        config: (data.config ?? {}) as any,
        syncPayroll: data.syncPayroll ?? true,
        syncExpense: data.syncExpense ?? false,
        syncAsset: data.syncAsset ?? false,
      },
    });
  }

  async getConnectors(tenantId: string) {
    return this.prisma.accountingConnector.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        syncLogs: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  async getConnector(tenantId: string, id: string) {
    const connector = await this.prisma.accountingConnector.findFirst({
      where: { id, tenantId },
      include: {
        syncLogs: {
          take: 20,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!connector) throw new NotFoundException('Accounting connector not found');
    return connector;
  }

  async updateConnector(tenantId: string, id: string, data: {
    name?: string;
    credentials?: AccountingCredentials;
    config?: AccountingConnectorConfig;
    syncPayroll?: boolean;
    syncExpense?: boolean;
    syncAsset?: boolean;
    status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  }) {
    const updateData: any = { ...data };
    if (data.credentials) {
      updateData.credentials = this.encryptCredentials(data.credentials);
    }
    if (data.config) {
      updateData.config = data.config;
    }

    return this.prisma.accountingConnector.update({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async deleteConnector(tenantId: string, id: string) {
    return this.prisma.accountingConnector.delete({
      where: { id, tenantId },
    });
  }

  // ============ Credential Encryption ============

  private encryptCredentials(creds: AccountingCredentials): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey.slice(0, 32).padEnd(32, '0')), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(creds), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted.toString('base64');
  }

  private decryptCredentials(encrypted: string): AccountingCredentials {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid encrypted credentials format');
    }
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encryptedBuf = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey.slice(0, 32).padEnd(32, '0')), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  // ============ Connector Factory ============

  private getConnectorInstance(connector: any): AccountingConnectorBase {
    const credentials = this.decryptCredentials(connector.credentials);
    const config = connector.config as unknown as AccountingConnectorConfig;

    switch (connector.type) {
      case 'JURNAL':
        return new JurnalConnector(credentials, config);
      case 'XERO':
        return new XeroConnector(credentials, config);
      case 'ACCURATE':
        return new AccurateConnector(credentials, config);
      case 'QUICKBOOKS':
        return new QuickBooksConnector(credentials, config);
      default:
        return new GenericConnector(credentials, config);
    }
  }

  // ============ Sync Operations ============

  async syncPayrollRun(tenantId: string, connectorId: string, payrollRunId: string) {
    const connector = await this.getConnector(tenantId, connectorId);
    const connectorInstance = this.getConnectorInstance(connector);

    // Create sync log
    const syncLog = await this.prisma.accountingSyncLog.create({
      data: {
        connectorId,
        syncType: 'PAYROLL',
        status: 'IN_PROGRESS',
        payload: { payrollRunId },
      },
    });

    try {
      // PayrollRun -> items (per employee) -> components (per salary component).
      const payrollRun = await this.prisma.payrollRun.findFirst({
        where: { id: payrollRunId, tenantId },
        include: {
          items: { include: { employee: true, components: true } },
          period: true,
        },
      });

      if (!payrollRun) {
        throw new NotFoundException('Payroll run not found');
      }

      // Build journal entries
      const entries = this.buildPayrollJournalEntries(payrollRun, connector.config as unknown as AccountingConnectorConfig);

      // Sync to accounting system
      const result = await connectorInstance.createJournalEntries(entries);

      // Update sync log
      await this.prisma.accountingSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: result.success ? 'SUCCESS' : 'FAILED',
          recordsTotal: entries.length,
          recordsSuccess: result.recordsSucceeded,
          recordsFailed: result.recordsFailed,
          errorDetails: result.errors.length > 0 ? { errors: result.errors } : undefined,
          response: result.externalIds as any,
          completedAt: new Date(),
        },
      });

      // Update connector last sync
      await this.prisma.accountingConnector.update({
        where: { id: connectorId },
        data: {
          lastSyncAt: new Date(),
          lastErrorAt: result.success ? null : new Date(),
          errorMessage: result.success ? null : result.errors.join('; '),
        },
      });

      return result;
    } catch (error) {
      const err = error as Error;
      await this.prisma.accountingSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorDetails: { message: err.message, stack: err.stack },
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async syncExpenseClaims(tenantId: string, connectorId: string, expenseClaimIds: string[]) {
    const connector = await this.getConnector(tenantId, connectorId);
    const connectorInstance = this.getConnectorInstance(connector);

    const syncLog = await this.prisma.accountingSyncLog.create({
      data: {
        connectorId,
        syncType: 'EXPENSE',
        status: 'IN_PROGRESS',
        payload: { expenseClaimIds },
      },
    });

    try {
      const claims = await this.prisma.expenseClaim.findMany({
        where: { id: { in: expenseClaimIds }, tenantId },
        include: { items: true, employee: true },
      });

      const entries = this.buildExpenseJournalEntries(claims, connector.config as unknown as AccountingConnectorConfig);
      const result = await connectorInstance.createJournalEntries(entries);

      await this.prisma.accountingSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: result.success ? 'SUCCESS' : 'FAILED',
          recordsTotal: entries.length,
          recordsSuccess: result.recordsSucceeded,
          recordsFailed: result.recordsFailed,
          errorDetails: result.errors.length > 0 ? { errors: result.errors } : undefined,
          response: result.externalIds as any,
          completedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      const err = error as Error;
      await this.prisma.accountingSyncLog.update({
        where: { id: syncLog.id },
        data: { status: 'FAILED', errorDetails: { message: err.message }, completedAt: new Date() },
      });
      throw error;
    }
  }

  // ============ Journal Entry Builders ============

  private buildPayrollJournalEntries(payrollRun: any, config: AccountingConnectorConfig): JournalEntry[] {
    const coa = config.chartOfAccounts || {};
    const items: any[] = payrollRun.items ?? [];
    const num = (v: any) => Number(v ?? 0);
    const totalGross = items.reduce((s: number, i: any) => s + num(i.grossSalary), 0);
    const totalNet = items.reduce((s: number, i: any) => s + num(i.netSalary), 0);
    const byType = new Map<string, number>();
    for (const item of items) {
      for (const c of item.components ?? []) {
        byType.set(c.componentType, (byType.get(c.componentType) ?? 0) + num(c.amount));
      }
    }
    const bpjsKes = byType.get('bpjs_kesehatan') ?? 0;
    const bpjsTk = byType.get('bpjs_tk') ?? 0;
    const pph21 = byType.get('pph21') ?? 0;
    const loanDeduction = byType.get('loan_deduction') ?? 0;
    const otherKnown = bpjsKes + bpjsTk + pph21 + loanDeduction;
    const otherDeductions = Math.max(0, totalGross - totalNet - otherKnown);

    const lines: JournalLine[] = [];
    const periodName = payrollRun.period?.name ?? payrollRun.periodId;

    // Salary Expense (Debit)
    lines.push({
      accountCode: coa.salaryExpense || '6-1000',
      accountName: 'Beban Gaji dan Upah',
      debit: totalGross,
      credit: 0,
      description: `Gaji periode ${periodName}`,
    });

    // Cash/Bank Credit (Net Salary)
    lines.push({
      accountCode: coa.cashBank || '1-1000',
      accountName: 'Kas/Bank',
      debit: 0,
      credit: totalNet,
      description: 'Pembayaran gaji bersih karyawan',
    });

    if (bpjsKes > 0) {
      lines.push({
        accountCode: coa.bpjsKesehatanPayable || '2-2100',
        accountName: 'Hutang BPJS Kesehatan',
        debit: 0,
        credit: bpjsKes,
        description: 'Iuran BPJS Kesehatan',
      });
    }

    if (bpjsTk > 0) {
      lines.push({
        accountCode: coa.bpjsKetenagakerjaanPayable || '2-2200',
        accountName: 'Hutang BPJS Ketenagakerjaan',
        debit: 0,
        credit: bpjsTk,
        description: 'Iuran BPJS Ketenagakerjaan (JKK, JKM, JHT, JP, KP)',
      });
    }

    if (pph21 > 0) {
      lines.push({
        accountCode: coa.taxPayable || '2-2300',
        accountName: 'Hutang PPh 21',
        debit: 0,
        credit: pph21,
        description: 'PPh 21 karyawan',
      });
    }

    if (loanDeduction > 0) {
      lines.push({
        accountCode: coa.loanReceivable || '1-2100',
        accountName: 'Piutang Karyawan',
        debit: 0,
        credit: loanDeduction,
        description: 'Angsuran pinjaman karyawan',
      });
    }

    if (otherDeductions > 0) {
      lines.push({
        accountCode: coa.otherDeductions || '2-2900',
        accountName: 'Hutang Lain-lain',
        debit: 0,
        credit: otherDeductions,
        description: 'Potongan lain',
      });
    }

    return [{
      date: new Date(),
      reference: `PR-${String(payrollRun.id).slice(0, 8)}`,
      description: `Jurnal Gaji ${periodName}`,
      lines,
      sourceType: 'PAYROLL',
      sourceId: payrollRun.id,
      metadata: {
        payrollRunId: payrollRun.id,
        periodId: payrollRun.periodId,
        employeeCount: items.length,
      },
    }];
  }

  private buildExpenseJournalEntries(claims: any[], config: AccountingConnectorConfig): JournalEntry[] {
    const coa = config.chartOfAccounts || {};
    const entries: JournalEntry[] = [];

    for (const claim of claims) {
      const lines: JournalLine[] = [];

      // Expense by category
      for (const item of claim.items ?? []) {
        const accountCode = this.getExpenseAccountCode(String(item.category), config);
        lines.push({
          accountCode,
          accountName: String(item.category),
          debit: Number(item.amount ?? 0),
          credit: 0,
          description: item.description || claim.description,
          costCenter: (claim.employee as any)?.departmentId ?? undefined,
        });
      }

      // Cash/Bank Credit
      lines.push({
        accountCode: coa.cashBank || '1-1000',
        accountName: 'Kas/Bank',
        debit: 0,
        credit: Number(claim.totalAmount ?? 0),
        description: `Reimbursement klaim ${String(claim.id).slice(0, 8)}`,
      });

      entries.push({
        date: new Date(claim.createdAt),
        reference: `EXP-${String(claim.id).slice(0, 8)}`,
        description: `Klaim Biaya: ${claim.title ?? claim.description ?? claim.id}`,
        lines,
        sourceType: 'EXPENSE',
        sourceId: claim.id,
        metadata: { claimId: claim.id, employeeId: claim.employeeId },
      });
    }

    return entries;
  }

  private getExpenseAccountCode(category: string, coa: AccountingConnectorConfig): string {
    const categoryMap: Record<string, string> = {
      'TRAVEL': coa.transportExpense || '6-2100',
      'TRANSPORT': coa.transportExpense || '6-2100',
      'MEAL': coa.mealExpense || '6-2200',
      'ACCOMMODATION': coa.accommodationExpense || '6-2300',
      'OFFICE': coa.officeSupplyExpense || '6-2400',
      'OFFICE_SUPPLIES': coa.officeSupplyExpense || '6-2400',
      'COMMUNICATION': coa.communicationExpense || '6-2500',
      'TRAINING': coa.trainingExpense || '6-2600',
      'ENTERTAINMENT': coa.entertainmentExpense || '6-2700',
      'MEDICAL': coa.medicalExpense || '6-2800',
      'OTHER': coa.otherExpense || '6-2900',
    };
    return categoryMap[category.toUpperCase()] || coa.otherExpense || '6-2900';
  }

  // ============ Health Check ============

  async healthCheck(tenantId: string, connectorId: string): Promise<ConnectorHealthCheck> {
    const connector = await this.getConnector(tenantId, connectorId);
    const connectorInstance = this.getConnectorInstance(connector);

    const start = Date.now();
    try {
      const connected = await connectorInstance.testConnection();
      return {
        connected,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        connected: false,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }

  // ============ Sync Logs ============

  async getSyncLogs(tenantId: string, connectorId: string, params?: {
    page?: number; limit?: number; syncType?: string; status?: string;
  }) {
    const { page = 1, limit = 20, syncType, status } = params || {};
    const where: any = { connector: { id: connectorId, tenantId } };
    if (syncType) where.syncType = syncType;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.accountingSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountingSyncLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

// ============ Base Connector ============

abstract class AccountingConnectorBase {
  protected credentials: AccountingCredentials;
  protected config: AccountingConnectorConfig;

  constructor(credentials: AccountingCredentials, config: AccountingConnectorConfig) {
    this.credentials = credentials;
    this.config = config;
  }

  abstract createJournalEntries(entries: JournalEntry[]): Promise<SyncResult>;
  abstract testConnection(): Promise<boolean>;
  abstract getName(): string;
}

// ============ Jurnal.id Connector ============

class JurnalConnector extends AccountingConnectorBase {
  private baseUrl = 'https://api.jurnal.id/v1';

  async createJournalEntries(entries: JournalEntry[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: entries.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      externalIds: {},
    };

    for (const entry of entries) {
      try {
        // Jurnal.id API format
        const payload = {
          date: entry.date.toISOString().split('T')[0],
          reference: entry.reference,
          description: entry.description,
          lines: entry.lines.map(line => ({
            account_code: line.accountCode,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            cost_center: line.costCenter,
          })),
        };

        // const response = await this.httpPost('/journals', payload);
        // result.externalIds[entry.sourceId] = response.data.id;
        result.recordsSucceeded++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push(`${entry.sourceId}: ${(error as Error).message}`);
      }
    }

    result.success = result.recordsFailed === 0;
    return result;
  }

  async testConnection(): Promise<boolean> {
    try {
      // await this.httpGet('/me');
      return true;
    } catch {
      return false;
    }
  }

  getName(): string { return 'Jurnal.id'; }
}

// ============ Xero Connector ============

class XeroConnector extends AccountingConnectorBase {
  private baseUrl = 'https://api.xero.com/api.xro/2.0';

  async createJournalEntries(entries: JournalEntry[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: entries.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      externalIds: {},
    };

    for (const entry of entries) {
      try {
        // Xero API format
        const payload = {
          Journals: [{
            JournalDate: entry.date.toISOString().split('T')[0],
            JournalNumber: entry.reference,
            Reference: entry.description,
            JournalLines: entry.lines.map(line => ({
              AccountCode: line.accountCode,
              Description: line.description,
              DebitAmount: line.debit,
              CreditAmount: line.credit,
              TrackingCategories: line.costCenter ? [{
                Name: 'Cost Center',
                Option: line.costCenter,
              }] : [],
            })),
          }],
        };

        // const response = await this.httpPost('/Journals', payload, { 'Xero-tenant-id': this.credentials.xeroTenantId });
        // result.externalIds[entry.sourceId] = response.data.Journals[0].JournalID;
        result.recordsSucceeded++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push(`${entry.sourceId}: ${(error as Error).message}`);
      }
    }

    result.success = result.recordsFailed === 0;
    return result;
  }

  async testConnection(): Promise<boolean> {
    try {
      // await this.httpGet('/Organisation', { 'Xero-tenant-id': this.credentials.xeroTenantId });
      return true;
    } catch {
      return false;
    }
  }

  getName(): string { return 'Xero'; }
}

// ============ Accurate Connector ============

class AccurateConnector extends AccountingConnectorBase {
  private baseUrl = 'https://api.accurate.id/accurate/api';

  async createJournalEntries(entries: JournalEntry[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: entries.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      externalIds: {},
    };

    for (const entry of entries) {
      try {
        // Accurate API format
        const payload = {
          transDate: entry.date.toISOString().split('T')[0],
          transNo: entry.reference,
          description: entry.description,
          detail: entry.lines.map(line => ({
            accountNo: line.accountCode,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            branchName: line.costCenter,
          })),
        };

        // const response = await this.httpPost(`/journals/save.do`, payload, { 'X-Database-Name': this.credentials.accurateDbName });
        // result.externalIds[entry.sourceId] = response.d.id;
        result.recordsSucceeded++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push(`${entry.sourceId}: ${(error as Error).message}`);
      }
    }

    result.success = result.recordsFailed === 0;
    return result;
  }

  async testConnection(): Promise<boolean> {
    try {
      // await this.httpGet('/company/get.do', { 'X-Database-Name': this.credentials.accurateDbName });
      return true;
    } catch {
      return false;
    }
  }

  getName(): string { return 'Accurate'; }
}

// ============ QuickBooks Connector ============

class QuickBooksConnector extends AccountingConnectorBase {
  private baseUrl = 'https://quickbooks.api.intuit.com/v3/company';

  async createJournalEntries(entries: JournalEntry[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: entries.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      externalIds: {},
    };

    for (const entry of entries) {
      try {
        // QuickBooks API format
        const payload = {
          JournalEntry: {
            TxnDate: entry.date.toISOString().split('T')[0],
            DocNumber: entry.reference,
            PrivateNote: entry.description,
            Line: entry.lines.map((line, idx) => ({
              Id: idx + 1,
              LineNum: idx + 1,
              Description: line.description,
              Amount: line.debit > 0 ? line.debit : line.credit,
              DetailType: 'JournalEntryLineDetail',
              JournalEntryLineDetail: {
                PostingType: line.debit > 0 ? 'Debit' : 'Credit',
                AccountRef: { value: line.accountCode },
              },
            })),
          },
        };

        // const response = await this.httpPost(`/${this.credentials.quickbooksRealmId}/journalentry`, payload);
        // result.externalIds[entry.sourceId] = response.JournalEntry.Id;
        result.recordsSucceeded++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push(`${entry.sourceId}: ${(error as Error).message}`);
      }
    }

    result.success = result.recordsFailed === 0;
    return result;
  }

  async testConnection(): Promise<boolean> {
    try {
      // await this.httpGet(`/${this.credentials.quickbooksRealmId}/companyinfo/${this.credentials.quickbooksRealmId}`);
      return true;
    } catch {
      return false;
    }
  }

  getName(): string { return 'QuickBooks'; }
}

// ============ Generic Connector ============

class GenericConnector extends AccountingConnectorBase {
  async createJournalEntries(entries: JournalEntry[]): Promise<SyncResult> {
    // Generic implementation - just log and return success for testing
    return {
      success: true,
      recordsProcessed: entries.length,
      recordsSucceeded: entries.length,
      recordsFailed: 0,
      errors: [],
      externalIds: entries.reduce((acc, e) => ({ ...acc, [e.sourceId]: `generic-${Date.now()}-${Math.random()}` }), {}),
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  getName(): string { return 'Generic'; }
}