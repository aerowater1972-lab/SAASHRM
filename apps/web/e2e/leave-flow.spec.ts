import { test, expect } from '@playwright/test';
import { loginAsHR, gotoAuth } from './helpers';

test.describe('Leave — List, New Request, Team Calendar', () => {
  let tokens: { accessToken: string; refreshToken: string };

  test.beforeEach(async ({ request }) => {
    tokens = await loginAsHR(request);
  });

  test('leave list renders heading and empty/new state', async ({ page }) => {
    await gotoAuth(page, tokens, '/leaves');
    await expect(page.getByRole('heading', { name: 'Cuti' }).first()).toBeVisible();
    await expect(page.getByText('Pengajuan Cuti').first()).toBeVisible();
  });

  test('new leave page shows request form', async ({ page }) => {
    await gotoAuth(page, tokens, '/leaves/new');
    await expect(page.getByRole('heading', { name: 'Pengajuan Cuti Baru' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^ajukan$/i })).toBeVisible();
  });

  test('team calendar month navigation works', async ({ page }) => {
    await gotoAuth(page, tokens, '/leaves/team-calendar');
    await expect(page.getByRole('heading', { name: 'Kalender Tim' })).toBeVisible();
    await expect(page.getByRole('button', { name: /bulan sebelumnya/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /bulan berikutnya/i })).toBeVisible();
  });
});
