import { AccountingEventConsumer } from './accounting-event.consumer';
import { DomainEventType } from '@modules/shared/events/event-registry';

describe('AccountingEventConsumer (UAT TC-03 auto-post)', () => {
  let consumer: AccountingEventConsumer;
  let registry: { register: jest.Mock };
  let connectors: { getConnectors: jest.Mock; syncPayrollRun: jest.Mock };
  let config: { get: jest.Mock };

  const job = (name: string, payload: Record<string, any> = {}) => ({
    id: 'job-1',
    queue: 'events',
    name,
    payload,
    status: 'PENDING' as any,
    retries: 0,
    maxRetries: 3,
    priority: 5,
    scheduledAt: new Date(),
    createdAt: new Date(),
    tenantId: 't-1',
  });

  beforeEach(() => {
    registry = { register: jest.fn() };
    connectors = {
      getConnectors: jest.fn(),
      syncPayrollRun: jest.fn().mockResolvedValue({ success: true }),
    };
    config = { get: jest.fn().mockReturnValue(undefined) };
    consumer = new AccountingEventConsumer(registry as any, connectors as any, config as any);
  });

  it('registers itself with the job registry on module init', () => {
    consumer.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(consumer);
  });

  it('ignores unrelated domain events', async () => {
    await consumer.handle(job(DomainEventType.PAYROLL_RUN_LOCKED, { payrollRunId: 'run-1' }));
    expect(connectors.getConnectors).not.toHaveBeenCalled();
  });

  it('is a no-op unless ACCOUNTING_AUTO_POST=true', async () => {
    await consumer.handle(
      job(DomainEventType.PAYROLL_RUN_APPROVED, { payrollRunId: 'run-1', tenantId: 't-1' }),
    );
    expect(connectors.getConnectors).not.toHaveBeenCalled();

    config.get.mockReturnValue('true');
    connectors.getConnectors.mockResolvedValue([]);
    await consumer.handle(
      job(DomainEventType.PAYROLL_RUN_APPROVED, { payrollRunId: 'run-1', tenantId: 't-1' }),
    );
    expect(connectors.getConnectors).toHaveBeenCalledWith('t-1');
  });

  it('posts the journal to every connector of the tenant when enabled', async () => {
    config.get.mockReturnValue('true');
    connectors.getConnectors.mockResolvedValue([
      { id: 'c-1', name: 'Jurnal' },
      { id: 'c-2', name: 'Xero' },
    ]);

    await consumer.handle(
      job(DomainEventType.PAYROLL_RUN_APPROVED, { payrollRunId: 'run-9', tenantId: 't-1' }),
    );

    expect(connectors.syncPayrollRun).toHaveBeenCalledTimes(2);
    expect(connectors.syncPayrollRun).toHaveBeenCalledWith('t-1', 'c-1', 'run-9');
    expect(connectors.syncPayrollRun).toHaveBeenCalledWith('t-1', 'c-2', 'run-9');
  });

  it('skips gracefully when payrollRunId is missing', async () => {
    config.get.mockReturnValue('true');
    await consumer.handle(job(DomainEventType.PAYROLL_RUN_APPROVED, { tenantId: 't-1' }));
    expect(connectors.getConnectors).not.toHaveBeenCalled();
  });

  it('never lets a connector failure fail the event job', async () => {
    config.get.mockReturnValue('true');
    connectors.getConnectors.mockResolvedValue([{ id: 'c-1', name: 'Jurnal' }]);
    connectors.syncPayrollRun.mockRejectedValue(new Error('HTTP 502'));

    await expect(
      consumer.handle(
        job(DomainEventType.PAYROLL_RUN_APPROVED, { payrollRunId: 'run-1', tenantId: 't-1' }),
      ),
    ).resolves.toBeUndefined();
  });
});
