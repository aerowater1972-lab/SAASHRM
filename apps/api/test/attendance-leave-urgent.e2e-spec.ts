import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Sudden Leave Escalation (e2e, BR-04)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let tenantId: string;
  const prisma = new PrismaClient();
  const runId = Date.now();
  let leaveTypeId: string;
  let requestId: string;
  let employeeId: string;

  beforeAll(async () => {
    tenantId = (await prisma.tenantEntity.findFirst({ select: { id: true } }))!.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const admin = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy.local', password: 'admin123' });
    adminToken = admin.body?.accessToken;

    const emp = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Urgent Emp', email: `urgent_${runId}@flexy.local` });
    const empId = emp.body.id;
    employeeId = empId;

    await prisma.user.create({
      data: {
        tenantId,
        email: `urgent_${runId}@flexy.local`,
        passwordHash: await import('bcryptjs').then((b) => b.hash('Str0ngP@ss9', 12)),
        fullName: 'Urgent Emp',
        employeeId: empId,
        status: 'ACTIVE',
      },
    });

    const user = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: `urgent_${runId}@flexy.local`, password: 'Str0ngP@ss9' });
    userToken = user.body?.accessToken;

    const lt = await request(app.getHttpServer())
      .post('/api/v1/attendance/leave-types')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `UrgentLT ${runId}`, code: `URGENT_${runId}`, allowNegativeBalance: true });
    leaveTypeId = lt.body.id;
  });

  afterAll(async () => {
    if (requestId) await prisma.leaveRequest.deleteMany({ where: { id: requestId } });
    if (leaveTypeId) await prisma.leaveType.deleteMany({ where: { id: leaveTypeId } });
    if (employeeId) await prisma.attendanceRecord.deleteMany({ where: { employeeId } });
    await prisma.employee.deleteMany({ where: { email: `urgent_${runId}@flexy.local` } });
    await prisma.user.deleteMany({ where: { email: `urgent_${runId}@flexy.local` } });
    await prisma.$disconnect();
    await app.close();
  });

  it('blocks approval of an urgent (H-1) leave until it is escalated (BR-04)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const submit = await request(app.getHttpServer())
      .post('/api/v1/attendance/leave-requests')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        leaveTypeId,
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
        reason: 'Family emergency',
      });
    expect([200, 201]).toContain(submit.status);
    requestId = submit.body.id;
    expect(submit.body.isUrgent).toBe(true);

    const approveBefore = await request(app.getHttpServer())
      .put(`/api/v1/attendance/leave-requests/${requestId}/approve`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveBefore.status).toBe(400);

    const escalate = await request(app.getHttpServer())
      .post(`/api/v1/attendance/leave-requests/${requestId}/escalate`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 201]).toContain(escalate.status);
    expect(escalate.body.escalated).toBe(true);

    const approveAfter = await request(app.getHttpServer())
      .put(`/api/v1/attendance/leave-requests/${requestId}/approve`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 201]).toContain(approveAfter.status);
    expect(approveAfter.body.status).toBe('APPROVED');
  });
});
