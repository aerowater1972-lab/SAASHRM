import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3001';

test.describe('Auth — Login & Session', () => {
  test('login page shows workspace picker', async ({ page }) => {
    await page.goto(`${WEB_URL}/login`);
    await expect(page.getByText('Pilih workspace Anda')).toBeVisible();
    await expect(page.getByRole('button', { name: /gunakan tenant custom/i })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto(`${WEB_URL}/login`);
    await page.getByRole('button', { name: /gunakan tenant custom/i }).click();
    await page.getByLabel('Email').fill('nobody@flexy.local');
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: /^masuk$/i }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10000 });
  });

  test('protected route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(`${WEB_URL}/leaves`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
