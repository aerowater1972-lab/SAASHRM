/* Live tenant-isolation probes (read-only + own login). Run via ts-node, deleted after audit. */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './src/app.module';

async function main() {
  const mod = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
  }).compile();
  const app: INestApplication = mod.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  // 1. health (public)
  let r = await request(app.getHttpServer()).get('/api/v1/health');
  log(`HEALTH status=${r.status} body=${JSON.stringify(r.body).slice(0, 80)}`);

  // 2. login as nusantara user (tenant B)
  r = await request(app.getHttpServer()).post('/api/v1/admin/auth/login')
    .set('x-tenant-id', 'nusantara')
    .send({ email: 'maya.sari@nusantarasejahtera.co.id', password: 'Demo123!' });
  log(`LOGIN-B status=${r.status} hasToken=${!!r.body.accessToken}`);
  const tokenB: string = r.body.accessToken;
  log(`LOGIN-B set-cookie=${JSON.stringify(r.headers['set-cookie'] || null)?.slice(0, 120)}`);

  // 3. cross-tenant read: tenant-B token reading default-tenant employee emp-001
  r = await request(app.getHttpServer()).get('/api/v1/employees/emp-001')
    .set('x-tenant-id', 'nusantara').set('Authorization', `Bearer ${tokenB}`);
  log(`XREAD emp-001-as-nusantara status=${r.status} body=${JSON.stringify(r.body).slice(0, 160)}`);

  // 4. same-tenant read (control): nusantara employee
  r = await request(app.getHttpServer()).get('/api/v1/employees/emp-NSM-2024-001')
    .set('x-tenant-id', 'nusantara').set('Authorization', `Bearer ${tokenB}`);
  log(`SREAD own-emp status=${r.status} bodyKeys=${JSON.stringify(r.body).slice(0, 120)}`);

  // 5. cookie-only auth (no Bearer header): does access_token cookie authenticate?
  r = await request(app.getHttpServer()).get('/api/v1/employees/emp-NSM-2024-001')
    .set('x-tenant-id', 'nusantara')
    .set('Cookie', `access_token=${tokenB}`);
  log(`COOKIE-AUTH status=${r.status}`);

  // 6. unauthenticated admin endpoint
  r = await request(app.getHttpServer()).get('/api/v1/admin/users');
  log(`NOAUTH admin/users status=${r.status}`);

  // 7. spoofed x-tenant-id with valid token (header says default, token says nusantara)
  r = await request(app.getHttpServer()).get('/api/v1/employees/emp-001')
    .set('x-tenant-id', 'default').set('Authorization', `Bearer ${tokenB}`);
  log(`SPOOF header=default+tokenB status=${r.status} body=${JSON.stringify(r.body).slice(0, 160)}`);

  await app.close().catch(() => undefined);
  setTimeout(() => process.exit(0), 500).unref();
  process.exit(0);
}
main().catch((e) => { console.error('PROBE-ERR', e.message); process.exit(1); });