import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ envFilePath: '.env' }),
        AppModule,
      ],
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/admin/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .set('x-tenant-id', 'default')
        .send({ email: 'admin@flexy.local', password: 'admin123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('admin@flexy.local');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .set('x-tenant-id', 'default')
        .send({ email: 'admin@flexy.local', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /api/v1/admin/auth/register', () => {
    let registeredEmail: string;

    it('should register a new user', async () => {
      registeredEmail = `e2e-user-${Date.now()}@flexy.local`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/register')
        .send({
          email: registeredEmail,
          password: 'password123',
          fullName: 'New User',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(registeredEmail);
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/register')
        .send({
          email: registeredEmail,
          password: 'password123',
          fullName: 'New User',
        })
        .expect(409);
    });
  });

  describe('POST /api/v1/admin/auth/refresh', () => {
    it('should refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .set('x-tenant-id', 'default')
        .send({ email: 'admin@flexy.local', password: 'admin123' })
        .expect(200);

      const refreshToken = loginRes.body.refreshToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/admin/auth/logout', () => {
    it('should logout successfully', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .set('x-tenant-id', 'default')
        .send({ email: 'admin@flexy.local', password: 'admin123' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
