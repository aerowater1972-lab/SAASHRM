import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';
const WEB_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@flexy.local';
const ADMIN_PASSWORD = 'admin123';

test.describe('BR-05 — SP Auto-Escalation UI', () => {
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
  }

  test('BR-05: Escalasi SP button visible for users with approve permission', async ({ page }) => {
    await authPage(page, '/employee-relations/disciplinary-cases');

    const escalateButton = page.getByRole('button', { name: /eskalasi/i });
    await expect(escalateButton).toBeVisible();
  });

  test('BR-05: Click Eskalasi SP triggers escalation and shows toast', async ({ page }) => {
    await authPage(page, '/employee-relations/disciplinary-cases');

    const escalateButton = page.getByRole('button', { name: /eskalasi/i });
    await expect(escalateButton).toBeVisible();

    // Listen for the sonner toast element before clicking
    const toast = page.locator('[data-sonner-toaster] li[data-sonner-toast]');

    await escalateButton.click();

    await expect(toast).toBeVisible({ timeout: 15000 });
  });
});
