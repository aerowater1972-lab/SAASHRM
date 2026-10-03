import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { EventBusService } from '../src/modules/shared/events/event-bus.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { DomainEventType } from '../src/modules/shared/events/event-registry';

describe('Epic 3 — attendance.period.closed -> payroll adjustments (e2e)', () => {
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

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    // Clean up stale jobs from previous test runs that may carry invalid userId references
    const cleanup = new PrismaClient();
    await cleanup.jobQueue.deleteMany({ where: { queue: 'events', status: { in: ['PENDING', 'FAILED'] } } }).catch(() => {});
    await cleanup.$disconnect();

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

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it(
    'PayrollEventConsumer converts attendance.period.closed into overtime EARNING + late DEDUCTION',
    async () => {
    const employee = await prisma.employee.findFirst({ where: { tenantId: 'default' } });
    expect(employee).toBeDefined();
    const employeeId = (employee as any).id;

    // Ensure the employee has an active employment with a graded level so the
    // consumer can derive an hourly rate (otherwise no adjustment is created).
    let employment: any = await prisma.employment.findFirst({
      where: { employeeId, isActive: true },
      include: { grade: true },
    });
    let grade =
      (employment?.grade as any) && (employment!.grade as any).level > 0
        ? (employment!.grade as any)
        : (await prisma.grade.findFirst({ where: { tenantId: 'default' } })) ??
          (await prisma.grade.create({
            data: { tenantId: 'default', name: 'E2E Grade', code: 'E2E-GRD', level: 4 },
          }));

    if (!employment) {
      const position = await prisma.position.findFirst({ where: { tenantId: 'default' } });
      const department = await prisma.department.findFirst({ where: { tenantId: 'default' } });
      if (!position || !department) throw new Error('Seed is missing position/department records');
      employment = await prisma.employment.create({
        data: {
          employeeId,
          positionId: position.id,
          departmentId: department.id,
          gradeId: (grade as any).id,
          type: 'PERMANENT',
          startDate: new Date(),
        },
      });
    } else if (!employment.gradeId || (employment.grade as any).level <= 0) {
      await prisma.employment.update({ where: { id: employment.id }, data: { gradeId: (grade as any).id } });
    }

    const period = `e2e-att-${Date.now()}`;
    const referenceId = `${period}:${employeeId}`;

    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@flexy-hrms.com' } });
    await eventBus.publishTyped(
      DomainEventType.ATTENDANCE_PERIOD_CLOSED,
      {
        employeeId,
        period,
        workedDays: 21,
        lateCount: 3,
        overtimeMinutes: 120,
        leaveDays: 1,
        tenantId: 'default',
      },
      { tenantId: 'default', userId: adminUser?.id ?? 'default' },
    );

    const ok = await pollUntil(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payroll/adjustments?employeeId=${employeeId}`)
        .set('x-tenant-id', 'default')
        .set(auth());
      const items: any[] = Array.isArray(res.body) ? res.body : res.body?.data ?? [];
      const earning = items.find(
        (a) => a.referenceId === referenceId && a.type === 'EARNING' && Number(a.amount) > 0,
      );
      const deduction = items.find(
        (a) => a.referenceId === referenceId && a.type === 'DEDUCTION' && Number(a.amount) > 0,
      );
      return !!earning && !!deduction;
    });

    expect(ok).toBe(true);
  },
    20000,
  );
});
