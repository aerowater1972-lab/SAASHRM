import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import * as bcryptjs from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@common/prisma/prisma.service';

describe('Expense module — lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let claimId: string;
  let employeeId: string;
  const TENANT = 'e2e-exp-tenant';
  const USER_EMAIL = 'expense-e2e@flexy.local';
  const USER_PASS = 'e2e-pass-123';

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

    // Ensure Tenant + TenantEntity for FKs (User → Tenant, Employee → TenantEntity)
    await prisma.tenant.upsert({
      where: { id: TENANT },
      update: {},
      create: { id: TENANT, name: `E2E Expense Tenant ${Date.now()}` },
    });
    await prisma.tenantEntity.upsert({
      where: { id: TENANT },
      update: {},
      create: { id: TENANT, tenantId: TENANT, name: 'E2E Exp Entity', code: 'E2EEXP' },
    });

    // Create employee and user (user must have employeeId for @CurrentUser('employeeId'))
    const unique = `e2e-exp-${Date.now()}`;
    const emp = await prisma.employee.create({
      data: {
        id: unique,
        tenantId: TENANT,
        employeeId: unique,
        fullName: 'Expense E2E Employee',
        email: unique + '@flexy.local',
        startDate: new Date('2026-01-01'),
        gender: 'MALE',
        maritalStatus: 'SINGLE',
      },
    });
    employeeId = emp.id;

    const hashed = bcryptjs.hashSync(USER_PASS, 10);
    await prisma.user.upsert({
      where: { id: `user-${unique}` },
      update: {},
      create: {
        id: `user-${unique}`,
        tenantId: TENANT,
        email: USER_EMAIL,
        fullName: 'Expense E2E User',
        passwordHash: hashed,
        employeeId: emp.id,
        status: 'ACTIVE',
      },
    });

    // Assign a role with expense-claims permissions (scoped to the test tenant)
    const expPerms = await prisma.permission.findMany({ where: { module: 'expense-claims' } });
    await prisma.role.upsert({
      where: { id: `role-${unique}` },
      update: {},
      create: {
        id: `role-${unique}`,
        tenantId: TENANT,
        name: 'Expense E2E Admin',
        isSystem: false,
      },
    });
    await prisma.rolePermission.createMany({
      data: expPerms.map((perm) => ({ roleId: `role-${unique}`, permissionId: perm.id, scope: 'ALL' })),
      skipDuplicates: true,
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: `user-${unique}`, roleId: `role-${unique}` } },
      update: {},
      create: { userId: `user-${unique}`, roleId: `role-${unique}` },
    });
  });

  afterAll(async () => {
    const roleIds = await prisma.role.findMany({ where: { tenantId: TENANT }, select: { id: true } });
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((r) => r.id) } } }).catch(() => {});
    await prisma.role.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
    await prisma.expenseClaim.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
    await prisma.employee.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
    await prisma.tenantEntity.delete({ where: { id: TENANT } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: TENANT } }).catch(() => {});
    await app.close();
  });

  it('POST /api/v1/admin/auth/login — get token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', TENANT)
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    token = res.body.accessToken;
    expect(token).toBeDefined();
  });

  it('POST /api/v1/expense/claims — create draft claim (no items, DRAFT)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/expense/claims')
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'E2E Test Claim', description: 'Office supplies for Q1' })
      .expect(201);
    claimId = res.body.id;
    expect(claimId).toBeDefined();
    expect(res.body.status).toBe('DRAFT');
  });

  it('POST /api/v1/expense/claims/:id/items — add item to draft', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/expense/claims/${claimId}/items`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Notebooks', amount: 150000, category: 'OFFICE_SUPPLIES', receiptUrl: 'http://files.local/r.jpg' })
      .expect(201);
  });

  it('POST /api/v1/expense/claims/:id/submit — submit for approval → PENDING', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/expense/claims/${claimId}/submit`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe('PENDING');
  });

  it('PUT /api/v1/expense/claims/:id/approve — approve claim → APPROVED', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/expense/claims/${claimId}/approve`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .query({ notes: 'Approved via e2e' })
      .expect(200);
    expect(res.body.status).toBe('APPROVED');
  });

  it('POST /api/v1/expense/claims/:id/pay — pay claim → PAID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/expense/claims/${claimId}/pay`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe('PAID');
  });

  it('POST /api/v1/expense/claims/:id/pay — engine rejects illegal transition', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/expense/claims/${claimId}/pay`)
      .set('x-tenant-id', TENANT)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
