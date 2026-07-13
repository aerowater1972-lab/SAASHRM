import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Management (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set('x-tenant-id', 'default')
      .send({ email: 'admin@flexy.local', password: 'admin123' });
    adminToken = res.body?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const email = `um_${Date.now()}@flexy.local`;

  it('creates a user with a role (admin:user:create)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ email, fullName: 'UM Test', password: 'Str0ngP@ss1', roleIds: ['role-employee'] });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
    expect(res.body.userRoles?.length).toBe(1);
  });

  it('rejects duplicate email (Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ email, fullName: 'Dup', password: 'Str0ngP@ss1' });
    expect(res.status).toBe(409);
  });

  let createdId: string;

  it('lists users (admin:user:read)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const found = res.body.data.find((u: any) => u.email === email);
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it('gets a user by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${createdId}`)
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('updates a user profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${createdId}`)
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ fullName: 'UM Updated' });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('UM Updated');
  });

  it('deactivates then reactivates a user (admin:user:update)', async () => {
    const deact = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${createdId}/deactivate`)
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(deact.status).toBe(200);
    expect(deact.body.status).toBe('INACTIVE');

    const react = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${createdId}/activate`)
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(react.status).toBe(200);
    expect(react.body.status).toBe('ACTIVE');
  });

  it('resets a user password (admin:user:reset-password)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${createdId}/reset-password`)
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ password: 'Res3tP@ssw0rd' });
    expect(res.status).toBe(200);
    expect(res.body.password).toBe('Res3tP@ssw0rd');
  });

  it('revokes a role from a user (admin:user:assign)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/admin/users/${createdId}/roles/role-employee`)
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.userRoles?.length).toBe(0);
  });

  it('protects the last active System Admin (BR-01) → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/users/user-1/deactivate')
      .set('x-tenant-id', 'default')
      .set(auth());
    expect(res.status).toBe(403);
  });

  it('changes the authenticated user password (admin/auth/change-password)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/change-password')
      .set('x-tenant-id', 'default')
      .set(auth())
      .send({ currentPassword: 'admin123', newPassword: 'admin123' });
    expect(res.status).toBe(200);
  });
});
