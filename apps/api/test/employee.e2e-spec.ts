import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@common/prisma/prisma.service';

describe('Employee module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let employeeId: string;
  const TENANT = 'e2e-emp-tenant';

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
    prisma = app.get(PrismaService);

    // Ensure a TenantEntity exists for our test tenant (Employee.tenantId FK → TenantEntity)
    await prisma.tenantEntity.upsert({
      where: { id: TENANT },
      update: {},
      create: { id: TENANT, tenantId: 'default', name: 'E2E Emp Tenant', code: 'E2EEMP' },
    });
  });

  afterAll(async () => {
    await prisma.employee.deleteMany({ where: { tenantId: TENANT } });
    await prisma.tenantEntity.delete({ where: { id: TENANT } }).catch(() => {});
    await app.close();
  });

  it('POST /api/v1/admin/auth/login — get token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy.local', password: 'admin123' })
      .expect(200);
    token = res.body.accessToken;
    expect(token).toBeDefined();
  });

  it('POST /api/v1/employees — create employee', async () => {
    const unique = `e2e-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId: unique,
        fullName: 'E2E Test Employee',
        email: `${unique}@flexy.local`,
        startDate: '2026-01-01',
        gender: 'MALE',
        maritalStatus: 'SINGLE',
      })
      .expect(201);
    employeeId = res.body.id;
    expect(res.body.employeeId).toBe(unique);
  });

  it('GET /api/v1/employees?page=1&limit=10 — server-side pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees?page=1&limit=10')
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  it('GET /api/v1/employees — unpaginated legacy array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/employees?page=1&limit=5&q=E2E — search', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/employees?page=1&limit=5&q=E2E`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/employees/:id — get single employee', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.id).toBe(employeeId);
  });

  it('DELETE /api/v1/employees/:id — soft-delete', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/employees/${employeeId}`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
