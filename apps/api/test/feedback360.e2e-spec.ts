import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Feedback360 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let sessionId: string;

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

  describe('/feedback360 (POST)', () => {
    it('should create a feedback session', async () => {
      const employee = await prisma.employee.findFirst({ where: { tenantId } });
      if (!employee) throw new Error('Employee not found');

      const cycle = await prisma.reviewCycle.create({
        data: {
          tenantId,
          name: 'E2E Test Cycle',
          period: 'Q3_2026',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          type: 'QUARTERLY',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/feedback360')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          revieweeId: employee.id,
          reviewCycleId: cycle.id,
          reviewerType: 'MANAGER',
          reviewerId: employee.id,
          questions: ['Communication', 'Leadership'],
        })
        .expect(201);

      expect(res.body.revieweeId).toBe(employee.id);
      expect(res.body.status).toBe('PENDING');
      sessionId = res.body.id;
    });
  });

  describe('/feedback360 (GET)', () => {
    it('should list feedback sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/feedback360')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('/feedback360/:id/review (POST)', () => {
    it('should submit a review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/feedback360/${sessionId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          responses: [
            { questionText: 'Communication', rating: 4, comment: 'Good' },
            { questionText: 'Leadership', rating: 5, comment: 'Excellent' },
          ],
        })
        .expect(201);

      expect(res.body.submitted).toBe(true);
    });
  });
});