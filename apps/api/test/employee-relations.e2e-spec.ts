import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@common/prisma/prisma.service';

describe('Employee Relations module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let vcId: string;
  let dcId: string;
  let incId: string;
  let ppeId: string;
  let empId: string;
  let adminId: string;
  const RUN = Date.now().toString(36);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    prisma = app.get(PrismaService);

    // Ensure a TenantEntity exists with id = 'default' so Employee FK works
    // (same pattern as seed-demo-nusantara: entity id == tenant id for API alignment)
    await prisma.tenantEntity.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', tenantId: 'default', name: 'Default Entity', code: 'DEF' },
    });

    // Clean up leftover data
    await prisma.ppeAssignment.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } });
    await prisma.incidentReport.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } });
    await prisma.disciplinaryCase.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } });
    await prisma.violationCategory.deleteMany({ where: { tenantId: 'default', code: { startsWith: 'E2E-VIO-' } } });

    // Create test employee (tenantId == TenantEntity.id == 'default', matching JWT tenantId)
    const emp = await prisma.employee.create({
      data: {
        id: `e2e-er-${RUN}`,
        tenantId: 'default',
        employeeId: `e2e-er-${RUN}`,
        fullName: 'E2E ER Employee',
        email: `e2e-er-${RUN}@flexy.local`,
        startDate: new Date('2026-01-01'),
        gender: 'MALE',
        maritalStatus: 'SINGLE',
      },
    });
    empId = emp.id;

    // Ensure ER permissions exist
    const erPerms = ['disciplinary-cases:read','disciplinary-cases:create','disciplinary-cases:update',
      'disciplinary-cases:approve','disciplinary-cases:acknowledge','incident-reports:read',
      'incident-reports:create','incident-reports:update','ppe-assignments:read','ppe-assignments:create',
      'ppe-assignments:update','k3:dashboard'];
    for (const perm of erPerms) {
      const idx = perm.lastIndexOf(':');
      await prisma.permission.upsert({
        where: { module_action: { module: perm.slice(0, idx), action: perm.slice(idx + 1) } },
        update: {},
        create: { module: perm.slice(0, idx), action: perm.slice(idx + 1), description: perm },
      });
    }

    // Find admin user's role(s) and assign ER permissions
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@flexy-hrms.com' },
      include: { userRoles: true },
    });
    adminId = adminUser?.id ?? '';
    if (adminUser?.userRoles?.length) {
      for (const ur of adminUser.userRoles) {
        for (const perm of erPerms) {
          const idx = perm.lastIndexOf(':');
          const p = await prisma.permission.findFirst({
            where: { module: perm.slice(0, idx), action: perm.slice(idx + 1) },
          });
          if (p) {
            await prisma.rolePermission.upsert({
              where: { roleId_permissionId: { roleId: ur.roleId, permissionId: p.id } },
              update: {},
              create: { roleId: ur.roleId, permissionId: p.id, scope: 'ALL' },
            }).catch(() => {});
          }
        }
      }
    }

    // Login — fresh JWT includes the newly assigned permissions
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' });
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.ppeAssignment.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } }).catch(() => {});
    await prisma.incidentReport.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } }).catch(() => {});
    await prisma.disciplinaryCase.deleteMany({ where: { tenantId: 'default', employeeId: { startsWith: 'e2e-er-' } } }).catch(() => {});
    await prisma.violationCategory.deleteMany({ where: { tenantId: 'default', code: { startsWith: 'E2E-VIO-' } } }).catch(() => {});
    await prisma.employee.deleteMany({ where: { id: `e2e-er-${RUN}` } }).catch(() => {});
    await app.close();
  });

  it('POST /api/v1/violation-categories — create', async () => {
    const code = `E2E-VIO-${RUN}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/violation-categories')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Test Violation', code, severity: 2, canSkipSP1: false })
      .expect(201);
    vcId = res.body.id;
    expect(res.body.name).toBe('E2E Test Violation');
    expect(res.body.code).toBe(code);
  });

  it('GET /api/v1/violation-categories — list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/violation-categories')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list = Array.isArray(res.body) ? res.body : (res.body.data ?? res.body.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    if (vcId) expect(list.some((v: any) => v.id === vcId)).toBe(true);
  });

  it('PUT /api/v1/violation-categories/:id — update', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/violation-categories/${vcId}`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Violation Updated' })
      .expect(200);
    expect(res.body.name).toBe('E2E Violation Updated');
  });

  it('POST /api/v1/disciplinary-cases — create SP (BR-01)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/disciplinary-cases')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: empId, violationCategoryId: vcId, description: 'E2E test SP' })
      .expect(201);
    dcId = res.body.id;
    expect(res.body.spLevel).toBeDefined();
    expect(res.body.status).toBe('DRAFT');
  });

  it('POST /api/v1/disciplinary-cases/:id/approve — approve (BR-02)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/disciplinary-cases/${dcId}/approve`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ approvedById: adminId })
      .expect(201);
    expect(res.body.status).toBe('APPROVED');
  });

  it('POST /api/v1/disciplinary-cases/:id/acknowledge — acknowledge', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/disciplinary-cases/${dcId}/acknowledge`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'E2E acknowledge via test' })
      .expect(201);
    expect(res.body.status).toBe('ACKNOWLEDGED');
    expect(res.body.acknowledgedAt).toBeDefined();
  });

  it('GET /api/v1/employees/:employeeId/disciplinary-history — SP history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/employees/${empId}/disciplinary-history`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: any) => d.id === dcId)).toBe(true);
  });

  it('POST /api/v1/incident-reports — create (FR-06)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/incident-reports')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId: empId, location: 'E2E Test Area',
        incidentDate: new Date().toISOString().split('T')[0],
        severity: 'MODERATE', category: 'ACCIDENT', description: 'E2E test incident',
      })
      .expect(201);
    incId = res.body.id;
    expect(res.body.status).toBe('REPORTED');
  });

  it('PUT /api/v1/incident-reports/:id — resolve', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/incident-reports/${incId}`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'RESOLVED', resolutionNotes: 'E2E test resolved' })
      .expect(200);
    expect(res.body.status).toBe('RESOLVED');
  });

  it('POST /api/v1/ppe-assignments — create (FR-08)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ppe-assignments')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: empId, ppeType: 'E2E Helmet', condition: 'NEW', notes: 'E2E test PPE' })
      .expect(201);
    ppeId = res.body.id;
    expect(res.body.status).toBe('ACTIVE');
  });

  it('POST /api/v1/ppe-assignments/:id/expire — expire PPE', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ppe-assignments/${ppeId}/expire`)
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.status).toBe('EXPIRED');
  });

  it('GET /api/v1/k3/dashboard — K3 dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/k3/dashboard')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect('totalIncidents' in res.body).toBe(true);
    expect('ppeExpiringSoon' in res.body).toBe(true);
  });

  it('GET /api/v1/k3/training-compliance — FR-11 training compliance', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/k3/training-compliance')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect('overallComplianceRate' in res.body).toBe(true);
    expect('totalActiveEmployees' in res.body).toBe(true);
    expect('byDepartment' in res.body).toBe(true);
  });

  it('GET /api/v1/k3/training-recommendations — FR-11 training recommendations', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/k3/training-recommendations')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/v1/disciplinary-cases/escalate-unacknowledged — BR-05 escalate', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/disciplinary-cases/escalate-unacknowledged')
      .set('x-tenant-id', 'default')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect('escalated' in res.body).toBe(true);
    expect(typeof res.body.escalated).toBe('number');
  });
});