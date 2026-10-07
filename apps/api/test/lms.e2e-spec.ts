import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('LMS (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let courseId: string;

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
      .send({ email: 'admin@flexy.local', password: 'admin123' })
      .expect(200);
    authToken = loginRes.body.accessToken;
    tenantId = loginRes.body.user.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/lms/courses (POST)', () => {
    it('should create a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/lms/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          title: 'Test Course',
          description: 'Test Description',
          category: 'Technical',
          duration: 120,
        })
        .expect(201);

      expect(res.body.title).toBe('Test Course');
      expect(res.body.isActive).toBe(true);
      courseId = res.body.id;
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/lms/courses')
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('/lms/courses (GET)', () => {
    it('should list courses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/lms/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('/lms/courses/:id (GET)', () => {
    it('should get course by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lms/courses/${courseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.id).toBe(courseId);
    });
  });

  describe('/lms/courses/:id/enroll (POST)', () => {
    it('should enroll a trainee', async () => {
      const employee = await prisma.employee.findFirst({ where: { tenantId } });
      if (!employee) throw new Error('Employee not found');
      
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lms/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ employeeId: employee.id })
        .expect(201);

      expect(res.body.employeeId).toBe(employee.id);
      expect(res.body.status).toBe('ENROLLED');
    });
  });
});