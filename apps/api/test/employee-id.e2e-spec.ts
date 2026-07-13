import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Employee Management — Employee ID (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;
  const runId = Date.now();
  const email = `emp_${runId}@flexy.local`;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const prisma = new PrismaClient();
    const tenant = await prisma.tenantEntity.findFirst({ select: { id: true } });
    tenantId = tenant!.id;
    await prisma.$disconnect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy.local', password: 'admin123' });
    adminToken = res.body?.accessToken;
  });

  afterAll(async () => {
    const prisma = new PrismaClient();
    await prisma.employee.deleteMany({ where: { email: { contains: String(runId) } } });
    await prisma.$disconnect();
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it('auto-generates employeeId when omitted (FR-03)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set(auth())
      .send({ fullName: 'Auto Emp', email });
    expect(res.status).toBe(201);
    expect(res.body.employeeId).toMatch(/^EMP\d{5}$/);
    createdIds.push(res.body.id);
  });

  it('keeps a provided employeeId and prevents change on update (BR-01)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set(auth())
      .send({ employeeId: `EMPXX${runId}`, fullName: 'Fixed Emp', email: `fixed_${email}` });
    expect(created.status).toBe(201);
    expect(created.body.employeeId).toBe(`EMPXX${runId}`);
    createdIds.push(created.body.id);

    const updated = await request(app.getHttpServer())
      .put(`/api/v1/employees/${created.body.id}`)
      .set('x-tenant-id', tenantId)
      .set(auth())
      .send({ employeeId: 'EMP-HACKED', fullName: 'Fixed Emp 2' });
    expect(updated.status).toBe(200);
    expect(updated.body.employeeId).toBe(`EMPXX${runId}`);
  });
});
