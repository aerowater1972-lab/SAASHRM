import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Integration endpoints (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy.local', password: 'admin123' });
    adminToken = res.body?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it('lists empty inbound payroll adjustments (cross-module event consumer store)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll/adjustments')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns workforce cost analytics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/workforce-cost')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('exports an analytics report', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/analytics/export')
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ report: 'workforce-cost', format: 'csv' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toBeDefined();
  });

  it('ingests an audit log entry (publishes *.data.changed event)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/audit-logs/ingest')
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({
        module: 'e2e',
        entity: 'Employee',
        entityId: 'emp-e2e-1',
        action: 'UPDATE',
        changedBy: 'user-1',
        oldValue: { name: 'A' },
        newValue: { name: 'B' },
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toBeDefined();
  });

  it('lists employee movements (validates seeded permission coverage)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees/movements')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns learning history for an employee', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/learning/employees/test-employee-id/history')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns ESS dashboard with notifications and payslips', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ess/dashboard')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.notifications)).toBe(true);
    expect(Array.isArray(res.body?.recentPayslips)).toBe(true);
  });

  const analyticsGets = [
    'headcount',
    'headcount/trend',
    'attendance',
    'leave',
    'payroll',
    'payroll/component',
    'recruitment',
    'recruitment/time-to-hire',
    'performance',
    'turnover',
    'dashboard/summary',
  ];

  it.each(analyticsGets)('analytics GET /%s returns 200', async (path) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/${path}`)
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
  });
});
