import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E test starter — verifikasi endpoint publik dasar dapat diakses tanpa
 * autentikasi (health check), sebagai titik awal E2E test suite untuk
 * engineer berikutnya (lihat Master Test Plan Bagian 8: target 10% E2E).
 *
 * PRASYARAT: PostgreSQL & Redis lokal harus berjalan (docker compose up -d)
 * dan .env sudah dikonfigurasi — lihat README.md.
 */
describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) — harus dapat diakses tanpa JWT', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('/api/v1/admin/tenants (GET) tanpa JWT — harus ditolak 401', () => {
    return request(app.getHttpServer()).get('/api/v1/admin/tenants').expect(401);
  });
});
