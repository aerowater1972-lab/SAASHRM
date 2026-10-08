import { test, expect } from '@playwright/test';
import { loginAsHR, gotoAuth } from './helpers';

test.describe('Attendance — Dashboard & Clock', () => {
  let tokens: { accessToken: string; refreshToken: string };

  test.beforeEach(async ({ request }) => {
    tokens = await loginAsHR(request);
  });

  test('attendance page renders status and clock action', async ({ page }) => {
    await gotoAuth(page, tokens, '/attendance');
    await expect(page.getByRole('heading', { name: 'Absensi' }).first()).toBeVisible();
    await expect(page.getByText(/clock in|belum clock in/i).first()).toBeVisible();
  });

  test('attendance history shows table or empty state', async ({ page }) => {
    await gotoAuth(page, tokens, '/attendance');
    const table = page.getByRole('columnheader', { name: /clock in/i });
    const emptyState = page.getByText(/belum ada riwayat absensi/i);
    await expect(table.or(emptyState).first()).toBeVisible();
  });
});
