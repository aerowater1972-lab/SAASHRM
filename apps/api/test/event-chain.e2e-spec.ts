import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EventBusService } from '../src/modules/shared/events/event-bus.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { DomainEventType } from '../src/modules/shared/events/event-registry';

describe('Event chain (publish -> JobWorker -> consumer)', () => {
  let app: INestApplication;
  let adminToken: string;
  let eventBus: EventBusService;
  let prisma: PrismaService;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function pollUntil(predicate: () => Promise<boolean>, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await sleep(400);
    }
    return false;
  }

  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    eventBus = app.get(EventBusService);
    prisma = app.get(PrismaService);

    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@flexy-hrms.com' } });
    adminUserId = adminUser!.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it('AuditEventConsumer persists a *.data.changed event as an AuditLog', async () => {
    await eventBus.publishTyped(
      DomainEventType.DATA_CHANGED,
      { entity: 'Employee', entityId: 'e2e-audit-1', action: 'UPDATE', changedBy: adminUserId, newValue: { x: 1 } },
      { tenantId: 'default', userId: adminUserId },
    );

    const ok = await pollUntil(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('x-tenant-id', 'default')
        .set(auth());
      const items: any[] = Array.isArray(res.body) ? res.body : res.body?.data ?? [];
      return items.some((a) => a.entityId === 'e2e-audit-1');
    });

    expect(ok).toBe(true);
  });

  it('PayrollEventConsumer turns expense.claim.approved into a payroll adjustment', async () => {
    const employee = await prisma.employee.findFirst();
    expect(employee).toBeDefined();
    const employeeId = (employee as any).id;

    await eventBus.publishTyped(
      DomainEventType.EXPENSE_CLAIM_APPROVED,
      { employeeId, claimId: 'claim-e2e-1', amount: 100000, category: 'TRAVEL' },
      { tenantId: 'default', userId: adminUserId },
    );

    const ok = await pollUntil(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payroll/adjustments?employeeId=${employeeId}`)
        .set('x-tenant-id', 'default')
        .set(auth());
      const items: any[] = Array.isArray(res.body) ? res.body : res.body?.data ?? [];
      return items.some(
        (a) => a.referenceId === 'claim-e2e-1' && a.type === 'EARNING' && Number(a.amount) === 100000,
      );
    });

    expect(ok).toBe(true);
  });
});
