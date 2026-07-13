import { AuditEventConsumer } from './audit-event.consumer';
import { AuditEventService } from './audit-event.service';
import { JobHandlerRegistry } from '../jobs/job-handler-registry.service';
import { DomainEventType } from './event-registry';

describe('AuditEventConsumer', () => {
  let consumer: AuditEventConsumer;
  let registry: any;
  let audit: any;

  beforeEach(() => {
    registry = { register: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    consumer = new AuditEventConsumer(registry, audit);
  });

  it('registers itself on module init', () => {
    consumer.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(consumer);
  });

  it('persists a DATA_CHANGED event as an audit entry', async () => {
    await consumer.handle({
      name: DomainEventType.DATA_CHANGED,
      payload: {
        module: 'payroll',
        entity: 'PayrollRun',
        entityId: 'run-1',
        action: 'APPROVE',
        changedBy: 'user-1',
        diff: { old: { status: 'DRAFT' }, new: { status: 'APPROVED' } },
        tenantId: 't1',
      },
    } as any);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPROVE',
        entity: 'PayrollRun',
        entityId: 'run-1',
        userId: 'user-1',
        tenantId: 't1',
        changes: { old: { status: 'DRAFT' }, new: { status: 'APPROVED' } },
      }),
    );
  });

  it('ignores non-audit events', async () => {
    await consumer.handle({ name: 'attendance.period.closed', payload: {} } as any);
    expect(audit.log).not.toHaveBeenCalled();
  });
});
