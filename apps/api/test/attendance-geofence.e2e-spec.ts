import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Attendance Geofence & Correction (e2e, BR-01 / FR-06)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;
  const prisma = new PrismaClient();
  const runId = Date.now();
  const empEmail = `geo_${runId}@flexy.local`;
  const userPassword = 'Str0ngP@ss9';
  let employeeId: string;
  let userId: string;
  let workLocationId: string;
  let recordId: string;
  let correctionId: string;

  beforeAll(async () => {
    // Ensure TenantEntity exists for the default tenant (aligns Tenant.id with TenantEntity.id)
    await prisma.tenantEntity.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', tenantId: 'default', name: 'Default Entity', code: 'DEF' },
    });
    tenantId = 'default';

    const location = await prisma.workLocation.create({
      data: {
        tenantId,
        name: 'Remote Site',
        latitude: -6.9,
        longitude: 107.6,
        radiusMeters: 150,
        isFlexible: false,
      },
    });
    workLocationId = location.id;

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
      .send({ employeeId: `geo-${runId}`, fullName: 'Geo Emp', email: empEmail });
    employeeId = emp.body.id;
    await prisma.employee.update({ where: { id: employeeId }, data: { workLocationId } });

    // Link a user so we can log in as the employee to submit a correction
    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: empEmail,
        passwordHash: await import('bcryptjs').then((b) => b.hash(userPassword, 12)),
        fullName: 'Geo Emp',
        employeeId,
        status: 'ACTIVE',
      },
    });
    userId = newUser.id;
    // Assign employee role for ess:attendance:clock permission
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: 'role-employee' } },
      update: {},
      create: { userId, roleId: 'role-employee' },
    }).catch(() => {});
    // Grant attendance:correction:create to the employee role for the correction test
    const correctionPerm = await prisma.permission.findFirst({ where: { module: 'attendance:correction', action: 'create' } });
    if (correctionPerm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: 'role-employee', permissionId: correctionPerm.id } },
        update: {},
        create: { roleId: 'role-employee', permissionId: correctionPerm.id },
      }).catch(() => {});
    }

    // Seed an attendance record to correct
    const rec = await prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId,
        date: new Date('2026-03-10T00:00:00.000Z'),
        clockIn: new Date('2026-03-10T01:00:00.000Z'),
        status: 'PRESENT',
      },
    });
    recordId = rec.id;
  });

  afterAll(async () => {
    await prisma.attendanceCorrection.deleteMany({ where: { id: correctionId } });
    await prisma.attendanceRecord.deleteMany({ where: { employeeId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.employee.deleteMany({ where: { id: employeeId } });
    await prisma.workLocation.deleteMany({ where: { id: workLocationId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects GPS clock-in outside the assigned geofence (BR-01)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: empEmail, password: userPassword });
    const userToken = login.body?.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/clock-in')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'GPS', latitude: 1.3521, longitude: 103.8198 });

    expect(res.status).toBe(400);
  });

  it('accepts QR clock-in without geofence checks', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: empEmail, password: userPassword });
    const userToken = login.body?.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/clock-in')
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'QR', latitude: 1.3521, longitude: 103.8198 });

    expect([200, 201]).toContain(res.status);
  });

  it('requires approval for an attendance correction (FR-06)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: empEmail, password: userPassword });
    const userToken = login.body?.accessToken;

    const submit = await request(app.getHttpServer())
      .put(`/api/v1/attendance/records/${recordId}`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'Forgot to clock out', clockOut: '2026-03-10T10:00:00.000Z' });
    expect([200, 201]).toContain(submit.status);
    correctionId = submit.body.id;
    expect(submit.body.status).toBe('PENDING');

    const approve = await request(app.getHttpServer())
      .post(`/api/v1/attendance/corrections/${correctionId}/approve`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 201]).toContain(approve.status);
    expect(approve.body.status).toBe('APPROVED');

    const updated = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    expect(updated!.isApproved).toBe(true);
    expect(updated!.clockOut).not.toBeNull();
  });
});
