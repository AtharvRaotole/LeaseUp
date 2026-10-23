import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

test.describe('Not found', () => {
  test('unknown route shows 404 page with home action', async ({ page }) => {
    await page.goto(`${BASE}/this-route-does-not-exist`);
    await expect(page.getByTestId('not-found-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to LeaseUp' })).toBeVisible();
  });
});
