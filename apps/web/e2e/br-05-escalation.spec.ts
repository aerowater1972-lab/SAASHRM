import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';
const WEB_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@flexy.local';
const ADMIN_PASSWORD = 'admin123';

test.describe('BR-05 — SP Auto-Escalation UI', () => {
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    accessToken = body.accessToken;
    expect(accessToken).toBeDefined();
  });

  test('BR-05: Escalasi SP button visible for users with approve permission', async ({ page }) => {
    await page.goto(WEB_URL);

    // Inject auth tokens into localStorage before navigating to protected page
    await page.evaluate((token) => {
      window.localStorage.setItem('flexy.accessToken', token);
      window.localStorage.setItem('flexy.refreshToken', token);
      window.localStorage.setItem('flexy.tenantId', 'default');
    }, accessToken);

    await page.goto(`${WEB_URL}/employee-relations/disciplinary-cases`);
    await page.waitForLoadState('networkidle');

    const escalateButton = page.getByRole('button', { name: /eskalasi/i });
    await expect(escalateButton).toBeVisible();
  });

  test('BR-05: Click Eskalasi SP triggers escalation and shows toast', async ({ page }) => {
    await page.goto(WEB_URL);

    await page.evaluate((token) => {
      window.localStorage.setItem('flexy.accessToken', token);
      window.localStorage.setItem('flexy.refreshToken', token);
      window.localStorage.setItem('flexy.tenantId', 'default');
    }, accessToken);

    // Wait for page to fully load with the SPA
    await page.goto(`${WEB_URL}/employee-relations/disciplinary-cases`);
    await page.waitForLoadState('networkidle');

    const escalateButton = page.getByRole('button', { name: /eskalasi/i });
    await expect(escalateButton).toBeVisible();

    // Listen for the sonner toast element before clicking
    const toast = page.locator('[data-sonner-toaster] li[data-sonner-toast]');

    await escalateButton.click();

    await expect(toast).toBeVisible({ timeout: 15000 });
  });
});
