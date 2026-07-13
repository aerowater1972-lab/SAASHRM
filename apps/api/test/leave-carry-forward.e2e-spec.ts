import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Leave Carry Forward (e2e, FR-13/BR-03)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;
  const prisma = new PrismaClient();
  const runId = Date.now();
  const empEmail = `cfemp_${runId}@flexy.local`;
  let employeeId: string;
  let leaveTypeId: string;
  const fromYear = 2024;
  const toYear = 2025;

  beforeAll(async () => {
    tenantId = (await prisma.tenantEntity.findFirst({ select: { id: true } }))!.id;

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
      .send({ email: 'admin@flexy.local', password: 'admin123' });
    adminToken = login.body?.accessToken;

    const emp = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'CF Emp', email: empEmail });
    employeeId = emp.body.id;

    const lt = await request(app.getHttpServer())
      .post('/api/v1/attendance/leave-types')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Annual ${runId}`,
        code: `ANNUAL_${runId}`,
        carryForwardLimit: 5,
        carryForwardExpiry: 'Q1_NEXT_YEAR',
      });
    leaveTypeId = lt.body.id;

    await prisma.leaveBalance.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        year: fromYear,
        totalEntitled: 12,
        carryForward: 0,
        totalUsed: 4,
        totalPending: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.leaveBalance.deleteMany({ where: { employeeId } });
    await prisma.leaveType.deleteMany({ where: { id: leaveTypeId } });
    await prisma.employee.deleteMany({ where: { id: employeeId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('carries forward the remaining balance capped by the leave type limit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/balances/apply-carry-forward')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fromYear, toYear });

    expect([200, 201]).toContain(res.status);

    const next = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year: toYear } },
    });
    expect(next).not.toBeNull();
    // remaining = 12 - 4 = 8, capped at carryForwardLimit 5
    expect(Number(next!.carryForward)).toBe(5);
  });
});
