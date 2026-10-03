import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Employee Medical (e2e, FR-05/BR-05)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;
  const runId = Date.now();
  const empEmail = `medemp_${runId}@flexy.local`;
  const userEmail = `meduser_${runId}@flexy.local`;
  const userPassword = 'Str0ngP@ss9';
  let employeeId: string;
  let userId: string;

  beforeAll(async () => {
    const prisma = new PrismaClient();
    tenantId = (await prisma.tenantEntity.findFirst({ select: { id: true } }))!.id;
    await prisma.$disconnect();

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
  });

  afterAll(async () => {
    const prisma = new PrismaClient();
    await prisma.employeeMedical.deleteMany({ where: { employeeId } });
    await prisma.employee.deleteMany({ where: { id: employeeId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('admin creates an employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set(auth(adminToken))
      .send({ fullName: 'Med Emp', email: empEmail });
    expect(res.status).toBe(201);
    employeeId = res.body.id;
  });

  it('stores and returns medical data (encrypted at rest)', async () => {
    const put = await request(app.getHttpServer())
      .put(`/api/v1/employees/${employeeId}/medical`)
      .set('x-tenant-id', tenantId)
      .set(auth(adminToken))
      .send({ allergies: 'Peanut', notes: 'Asthma' });
    expect(put.status).toBe(200);
    expect(put.body.allergies).toBe('Peanut');
    expect(put.body.notes).toBe('Asthma');

    const get = await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}/medical`)
      .set('x-tenant-id', tenantId)
      .set(auth(adminToken));
    expect(get.status).toBe(200);
    expect(get.body.allergies).toBe('Peanut');

    const prisma = new PrismaClient();
    const raw = await prisma.employeeMedical.findUnique({ where: { employeeId } });
    await prisma.$disconnect();
    expect(raw!.allergies).not.toBe('Peanut'); // encrypted at rest
  });

  it('denies medical read to a role without the permission (BR-05)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('x-tenant-id', 'default')
      .set(auth(adminToken))
      .send({ email: userEmail, fullName: 'Med User', password: userPassword, roleIds: ['role-employee'] });
    expect(created.status).toBe(201);
    userId = created.body.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: userEmail, password: userPassword });
    const userToken = login.body?.accessToken;
    expect(userToken).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}/medical`)
      .set('x-tenant-id', tenantId)
      .set(auth(userToken));
    expect(res.status).toBe(403);
  });
});
