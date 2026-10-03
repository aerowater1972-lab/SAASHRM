import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('IDP (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let planId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/idp (POST)', () => {
    it('should create an IDP', async () => {
      const employee = await prisma.employee.findFirst({ where: { tenantId } });
      if (!employee) throw new Error('Employee not found');
      
      const res = await request(app.getHttpServer())
        .post('/api/v1/idp')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          employeeId: employee.id,
          title: 'Leadership Development',
          description: 'Develop leadership skills',
          targetDate: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
        })
        .expect(201);

      expect(res.body.employeeId).toBe(employee.id);
      expect(res.body.status).toBe('DRAFT');
      planId = res.body.id;
    });
  });

  describe('/idp (GET)', () => {
    it('should list IDPs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/idp')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('/idp/:id/activities (POST)', () => {
    it('should add an activity to IDP', async () => {
      const employee = await prisma.employee.findFirst({ where: { tenantId } });
      if (!employee) throw new Error('Employee not found');
      
      const res = await request(app.getHttpServer())
        .post(`/api/v1/idp/${planId}/activities`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          title: 'Leadership Workshop',
          activityType: 'TRAINING',
          targetDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        })
        .expect(201);

      expect(res.body.title).toBe('Leadership Workshop');
      expect(res.body.status).toBe('PENDING');
    });
  });

  describe('/idp/employee/:employeeId/summary (GET)', () => {
    it('should get employee IDP summary', async () => {
      const employee = await prisma.employee.findFirst({ where: { tenantId } });
      if (!employee) throw new Error('Employee not found');
      
      const res = await request(app.getHttpServer())
        .get(`/api/v1/idp/employee/${employee.id}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.employeeId).toBe(employee.id);
      expect(typeof res.body.totalPlans).toBe('number');
    });
  });
});