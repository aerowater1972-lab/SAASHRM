import { test, expect } from '@playwright/test';

// Smoke untuk halaman baru hasil audit integrasi:
// - /leaves/team-calendar (kalender tim)
// - /attendance/rosters (manajemen roster)
// Read-only: tidak membuat/mengubah data.

const API_BASE = 'http://localhost:3000/api/v1';
const WEB_URL = 'http://localhost:3001';
const HR_EMAIL = 'maya.sari@nusantarasejahtera.co.id';
const HR_PASSWORD = 'Demo123!';
const TENANT = 'nusantara';

async function loginAsHR(request: any): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request.fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT },
    data: { email: HR_EMAIL, password: HR_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.accessToken).toBeDefined();
  return { accessToken: body.accessToken as string, refreshToken: body.refreshToken as string };
}

async function authPage(page: any, tokens: { accessToken: string; refreshToken: string }, path: string) {
  // Single navigation: AuthProvider restores the session once on boot.
  // (A second goto would re-trigger restore and burn the rotated token.)
  // addInitScript runs before app scripts, so tenant is present at init.
  await page.addInitScript(({ tenant }: { tenant: string }) => {
    window.localStorage.setItem('flexy.tenantId', tenant);
  }, { tenant: TENANT });
  await page.context().addCookies([
    { name: 'access_token', value: tokens.accessToken, domain: 'localhost', path: '/' },
    { name: 'refresh_token', value: tokens.refreshToken, domain: 'localhost', path: '/api/v1/admin/auth' },
  ]);
  await page.goto(`${WEB_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

test.describe('Halaman baru audit integrasi (smoke)', () => {
  let tokens: { accessToken: string; refreshToken: string };

  // Fresh login per test: refresh tokens are single-use (rotated on every
  // refresh), so sharing one token across tests would blacklist it.
  test.beforeEach(async ({ request }) => {
    tokens = await loginAsHR(request);
  });

  test('kalender tim me-render grid bulanan', async ({ page }) => {
    await authPage(page, tokens, '/leaves/team-calendar');
    await expect(page.getByRole('heading', { name: /kalender tim/i })).toBeVisible();
    // header hari Senin..Min dan navigasi bulan
    await expect(page.getByText('Sen', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Min', { exact: true }).first()).toBeVisible();
  });

  test('halaman roster me-render daftar dan dialog buat', async ({ page }) => {
    await authPage(page, tokens, '/attendance/rosters');
    await expect(page.getByRole('heading', { name: /^roster$/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /buat roster/i }).click();
    await expect(page.getByRole('heading', { name: 'Buat Roster' })).toBeVisible();
  });
});
