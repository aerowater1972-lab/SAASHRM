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

async function loginAsHR(request: any): Promise<string> {
  const res = await request.fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT },
    data: { email: HR_EMAIL, password: HR_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.accessToken).toBeDefined();
  return body.accessToken as string;
}

async function authPage(page: any, token: string, path: string) {
  await page.goto(WEB_URL);
  await page.evaluate(
    ({ t, tenant }: { t: string; tenant: string }) => {
      window.localStorage.setItem('flexy.accessToken', t);
      window.localStorage.setItem('flexy.refreshToken', t);
      window.localStorage.setItem('flexy.tenantId', tenant);
    },
    { t: token, tenant: TENANT },
  );
  await page.goto(`${WEB_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

test.describe('Halaman baru audit integrasi (smoke)', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAsHR(request);
  });

  test('kalender tim me-render grid bulanan', async ({ page }) => {
    await authPage(page, token, '/leaves/team-calendar');
    await expect(page.getByRole('heading', { name: /kalender tim/i })).toBeVisible();
    // header hari Senin..Min dan navigasi bulan
    await expect(page.getByText('Sen', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Min', { exact: true }).first()).toBeVisible();
  });

  test('halaman roster me-render daftar dan dialog buat', async ({ page }) => {
    await authPage(page, token, '/attendance/rosters');
    await expect(page.getByRole('heading', { name: /^roster$/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /buat roster/i }).click();
    await expect(page.getByRole('heading', { name: 'Buat Roster' })).toBeVisible();
  });
});
