import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Attendance Period Close (e2e, attendance.period.closed)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;
  const prisma = new PrismaClient();
  const runId = Date.now();
  const empEmail = `periode_${runId}@flexy.local`;
  let employeeId: string;
  let periodId: string;

  beforeAll(async () => {
    await prisma.tenantEntity.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', tenantId: 'default', name: 'Default Entity', code: 'DEF' },
    });
    tenantId = 'default';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' });
    adminToken = login.body?.accessToken;

    const emp = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: `per-${runId}`, fullName: 'Period Emp', email: empEmail });
    employeeId = emp.body.id;

    const period = await prisma.payrollPeriod.create({
      data: {
        tenantId,
        name: `Test Period ${runId}`,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        status: 'OPEN',
      },
    });
    periodId = period.id;

    await prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId,
        date: new Date('2026-01-15'),
        clockIn: new Date('2026-01-15T08:00:00Z'),
        clockOut: new Date('2026-01-15T17:00:00Z'),
        status: 'PRESENT',
      },
    });
  });

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({ where: { employeeId } });
    await prisma.payrollPeriod.deleteMany({ where: { id: periodId } });
    await prisma.employee.deleteMany({ where: { id: employeeId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('closes the period and returns a per-employee summary', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/attendance/periods/${periodId}/close`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 201]).toContain(res.status);
    expect(res.body.period.status).toBe('CLOSED');
    expect(Array.isArray(res.body.summary)).toBe(true);
    const mine = res.body.summary.find((s: any) => s.employeeId === employeeId);
    expect(mine).toBeDefined();
    expect(mine.presentDays).toBeGreaterThanOrEqual(1);
  });

  it('rejects closing an already-closed period', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/attendance/periods/${periodId}/close`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
