import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Succession Planning (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let poolId: string;
  let planId: string;
  let employee: { id: string };
  let position: { id: string };
  const empEmail = `succession-e2e@flexy.local`;
  const empEmployeeId = `succession-e2e-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy-hrms.com', password: 'admin123' })
      .expect(200);
    authToken = loginRes.body.accessToken;
    tenantId = 'default';

    await prisma.tenantEntity.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', tenantId: 'default', name: 'Default Entity', code: 'DEF' },
    });

    const foundPos = await prisma.position.findFirst({ where: { tenantId } });
    if (!foundPos) throw new Error('Position not found in default tenant');

    const created = await prisma.employee.create({
      data: {
        tenantId,
        employeeId: empEmployeeId,
        fullName: 'Succession E2E Employee',
        email: empEmail,
        status: 'ACTIVE',
      },
    });
    employee = { id: created.id };
    position = { id: foundPos.id };
  });

  afterAll(async () => {
    await prisma.talentPoolMember.deleteMany({ where: { employeeId: employee.id } });
    await prisma.successionCandidate.deleteMany({ where: { planId } });
    await prisma.successionPlan.deleteMany({ where: { id: planId } });
    await prisma.talentPool.deleteMany({ where: { id: poolId } }).catch(() => {});
    await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
    await app.close();
  });

  describe('/succession/pools (CRUD)', () => {
    it('should create a talent pool', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/succession/pools')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ name: 'E2E Fast Track', description: 'Test pool', criteria: 'High potential' })
        .expect(201);

      expect(res.body.name).toBe('E2E Fast Track');
      poolId = res.body.id;
    });

    it('should list talent pools', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/succession/pools')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === poolId)).toBe(true);
    });

    it('should add a member to the pool', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/succession/pools/${poolId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          employeeId: employee.id,
          performanceBand: 'HIGH',
          potentialBand: 'HIGH',
          readiness: 'READY_NOW',
        })
        .expect(201);

      expect(res.body.employeeId).toBe(employee.id);
      expect(res.body.readiness).toBe('READY_NOW');
    });

    it('should reject adding the same member twice', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/succession/pools/${poolId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ employeeId: employee.id })
        .expect(400);
    });
  });

  describe('/succession/plans (CRUD)', () => {
    it('should create a succession plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/succession/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          positionId: position.id,
          currentEmployeeId: employee.id,
          riskCode: 'HIGH',
        })
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.positionId).toBe(position.id);
      planId = res.body.id;
    });

    it('should list succession plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/succession/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === planId)).toBe(true);
    });

    it('should add a candidate to the plan', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/succession/plans/${planId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          employeeId: employee.id,
          readiness: 'READY_NOW',
          rank: 1,
        })
        .expect(201);

      expect(res.body.readiness).toBe('READY_NOW');
      expect(res.body.rank).toBe(1);
    });

    it('should activate the plan', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/succession/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ status: 'ACTIVE' })
        .expect(200);
    });

    it('should return summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/succession/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(typeof res.body.totalPlans).toBe('number');
      expect(res.body.totalPlans).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.totalPools).toBe('number');
    });

    it('should delete the plan', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/succession/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(204);
    });

    it('should delete the pool', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/succession/pools/${poolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(204);
    });
  });
});