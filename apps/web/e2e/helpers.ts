import { test as base, expect } from '@playwright/test';

// Shared authenticated-page helper.
// - Fresh login per test: refresh tokens are single-use (rotated on every
//   refresh), so sharing one token across tests would blacklist it.
// - Single navigation: AuthProvider restores once on boot (a second goto
//   would re-trigger restore and burn the rotated refresh token).
const API_BASE = 'http://localhost:3000/api/v1';
const WEB_URL = 'http://localhost:3001';

export async function loginAsHR(request: any, email = 'admin@flexy.local', password = 'admin123') {
  const res = await request.fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default' },
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.accessToken).toBeDefined();
  return { accessToken: body.accessToken as string, refreshToken: body.refreshToken as string };
}

export async function gotoAuth(
  page: any,
  tokens: { accessToken: string; refreshToken: string },
  path: string,
  tenant = 'default',
) {
  await page.addInitScript(({ t }: { t: string }) => {
    window.localStorage.setItem('flexy.tenantId', t);
  }, { t: tenant });
  await page.context().addCookies([
    { name: 'access_token', value: tokens.accessToken, domain: 'localhost', path: '/' },
    { name: 'refresh_token', value: tokens.refreshToken, domain: 'localhost', path: '/api/v1/admin/auth' },
  ]);
  await page.goto(`${WEB_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

export { expect };
export const authTest = base;
