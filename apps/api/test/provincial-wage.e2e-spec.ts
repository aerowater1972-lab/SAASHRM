import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Provincial Wage (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let wageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' })
      .expect(200);
    authToken = loginRes.body.accessToken;
    tenantId = loginRes.body.user.tenantId;

    await prisma.provincialMinimumWage.deleteMany({
      where: { tenantId, province: 'DKI Jakarta' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/wage/provincial (POST)', () => {
    it('should create a wage entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wage/provincial')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          province: 'DKI Jakarta',
          year: 2026,
          amount: 5067230,
        })
        .expect(201);

      expect(res.body.province).toBe('DKI Jakarta');
      expect(res.body.year).toBe(2026);
      expect(Number(res.body.minimumWage)).toBe(5067230);
      wageId = res.body.id;
    });

    it('should reject duplicate province/year', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wage/provincial')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          province: 'DKI Jakarta',
          year: 2026,
          amount: 5067230,
        })
        .expect(409);
    });
  });

  describe('/wage/provincial (GET)', () => {
    it('should list wage entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wage/provincial')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('/wage/provincial/calculate (GET)', () => {
    it('should calculate minimum wage for employee', async () => {
      let employee = await prisma.employee.findFirst({ where: { tenantId, province: { not: null } } });
      if (!employee) {
        employee = await prisma.employee.findFirst({ where: { tenantId } });
        if (!employee) throw new Error('Employee not found');
        employee = await prisma.employee.update({ where: { id: employee.id }, data: { province: 'DKI Jakarta' } });
      }
      if (!employee) throw new Error('Employee with province not found');

      const res = await request(app.getHttpServer())
        .get('/api/v1/wage/provincial/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .query({ employeeId: employee.id })
        .expect(200);

      expect(res.body.employeeId).toBe(employee.id);
      expect(typeof res.body.hasProvincialWage).toBe('boolean');
    });
  });

  describe('/wage/provincial/stats (GET)', () => {
    it('should get wage statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wage/provincial/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(typeof res.body.totalEntries).toBe('number');
      expect(typeof res.body.uniqueProvinces).toBe('number');
    });
  });
});