import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3001';
const API_BASE = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@flexy.local';
const ADMIN_PASSWORD = 'admin123';

test.describe('FR-11 — Training Compliance Dashboard', () => {
  let tokens: { accessToken: string; refreshToken: string };

  // Fresh login per test: refresh tokens are single-use (rotated on every
  // refresh), so sharing one token across tests would blacklist it.
  test.beforeEach(async ({ request }) => {
    const res = await request.fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    tokens = { accessToken: body.accessToken, refreshToken: body.refreshToken };
  });

  async function authPage(page: any, path: string) {
    // Single navigation: AuthProvider restores once on boot (a second goto
    // would re-trigger restore and burn the rotated refresh token).
    await page.addInitScript(() => {
      window.localStorage.setItem('flexy.tenantId', 'default');
    });
    await page.context().addCookies([
      { name: 'access_token', value: tokens.accessToken, domain: 'localhost', path: '/' },
      { name: 'refresh_token', value: tokens.refreshToken, domain: 'localhost', path: '/api/v1/admin/auth' },
    ]);
    await page.goto(`${WEB_URL}${path}`);
    await page.waitForLoadState('networkidle');
  };

  test('FR-11: Training compliance card visible on employee-relations dashboard', async ({ page }) => {
    await authPage(page, '/employee-relations');

    // Verify the "Kepatuhan Pelatihan K3" card is present
    const complianceCard = page.getByText('Kepatuhan Pelatihan K3');
    await expect(complianceCard).toBeVisible({ timeout: 10000 });

    // Verify overall compliance rate is shown (e.g., "0%")
    const complianceRate = page.getByText(/\d+%/).filter({ hasText: /%/ });
    await expect(complianceRate.first()).toBeVisible();

    // Verify employee counts: "completed/total karyawan" - use the specific span
    const employeeCount = page.getByText(/\d+\/\d+\s+karyawan/);
    await expect(employeeCount).toBeVisible();
  });

  test('FR-11: Department compliance chart renders', async ({ page }) => {
    await authPage(page, '/employee-relations');

    // Verify the bar chart for "Kepatuhan Pelatihan per Departemen" is rendered
    // recharts renders SVG elements - look for the chart container or SVG
    const chartContainer = page.locator('[class*="recharts"]').or(page.locator('svg')).first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });

    // Verify department progress bars (the horizontal bar charts)
    const progressBars = page.locator('[class*="w-24"]').or(page.locator('[style*="width:"]')).filter({ hasText: /%/ });
    // At least one should exist for "Tanpa Divisi" department
    await expect(progressBars.first()).toBeVisible({ timeout: 10000 });
  });

  test('FR-11: Export CSV button works for training compliance', async ({ page }) => {
    await authPage(page, '/employee-relations');

    // Find the Export CSV button
    const exportBtn = page.getByRole('button', { name: /export csv/i });
    await expect(exportBtn).toBeVisible();

    // Click and verify download (in headless, we just verify click doesn't error)
    await exportBtn.click();
  });
});