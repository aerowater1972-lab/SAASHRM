import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobHandler, Job } from '@modules/shared/jobs/job-handler.interface';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { AccountingConnectorService } from './accounting-connector.service';

/**
 * TC-03 (payroll journal auto-post): when a payroll run is approved the
 * domain event `payroll.run.approved` fans out to this consumer, which posts
 * the debit/credit journal entries to every accounting connector configured
 * for the tenant (Jurnal/Xero/Accurate/QuickBooks/Custom).
 *
 * Opt-in via `ACCOUNTING_AUTO_POST=true` so environments without accounting
 * credentials stay silent; failures are logged and never fail the event job.
 */
@Injectable()
export class AccountingEventConsumer implements JobHandler, OnModuleInit {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(AccountingEventConsumer.name);

  constructor(
    private readonly registry: JobHandlerRegistry,
    private readonly connectors: AccountingConnectorService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
    this.logger.log(
      `AccountingEventConsumer registered (ACCOUNTING_AUTO_POST=${
        this.config.get('ACCOUNTING_AUTO_POST') || 'false'
      })`,
    );
  }

  async handle(job: Job): Promise<void> {
    if (job.name !== DomainEventType.PAYROLL_RUN_APPROVED) return;
    if (this.config.get<string>('ACCOUNTING_AUTO_POST') !== 'true') return;

    const payload = (job.payload?.payload || job.payload || {}) as Record<string, any>;
    const tenantId = payload.tenantId || job.tenantId || 'default';
    const payrollRunId = payload.payrollRunId;
    if (!payrollRunId) {
      this.logger.warn('PAYROLL_RUN_APPROVED without payrollRunId — skipping auto-post');
      return;
    }

    const connectors = await this.connectors.getConnectors(tenantId);
    if (!connectors.length) {
      this.logger.log(
        `No accounting connectors for tenant ${tenantId} — payroll journal auto-post skipped`,
      );
      return;
    }

    for (const connector of connectors) {
      try {
        await this.connectors.syncPayrollRun(tenantId, connector.id, payrollRunId);
        this.logger.log(
          `Payroll journal auto-posted (run=${payrollRunId}, connector=${connector.name})`,
        );
      } catch (err: any) {
        // Journal sync failure must never fail the domain event — the manual
        // `POST /accounting-connectors/:id/sync/payroll` retry endpoint remains.
        this.logger.warn(
          `Payroll journal auto-post failed (run=${payrollRunId}, connector=${connector.id}): ${
            err?.message || err
          }`,
        );
      }
    }
  }
}
