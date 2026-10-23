import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

test.describe('LeaseUp feature pages (demo)', () => {
  test('brand reverse page loads', async ({ page }) => {
    await page.goto(`${BASE}/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E`);
    await expect(page.getByTestId('brand-reverse-page')).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId('brand-opportunities')).toBeVisible({ timeout: 60000 });
  });

  test('portfolio page loads input', async ({ page }) => {
    await page.goto(`${BASE}/portfolio`);
    await expect(page.getByTestId('portfolio-page')).toBeVisible();
    await expect(page.getByTestId('portfolio-input')).toBeVisible();
  });
});
