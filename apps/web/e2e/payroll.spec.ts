import { test, expect } from '@playwright/test';
import { loginAsHR, gotoAuth } from './helpers';

test.describe('Payroll — Runs & Components', () => {
  let tokens: { accessToken: string; refreshToken: string };

  test.beforeEach(async ({ request }) => {
    tokens = await loginAsHR(request);
  });

  test('payroll page renders navigation tabs', async ({ page }) => {
    await gotoAuth(page, tokens, '/payroll');
    await expect(page.getByRole('link', { name: /payroll periods/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /components/i }).first()).toBeVisible();
  });

  test('salary component dialog selects are labeled for screen readers', async ({ page }) => {
    await gotoAuth(page, tokens, '/payroll/salary-components');
    await page.getByRole('button', { name: /tambah component/i }).click();
    await expect(page.getByLabel('Employee')).toBeVisible();
    await expect(page.getByLabel('Type')).toBeVisible();
  });
});
