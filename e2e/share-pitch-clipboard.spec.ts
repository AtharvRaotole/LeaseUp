import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Share pitch clipboard fallback', () => {
  test('shows selectable link when clipboard write is denied', async ({ page, context }) => {
    test.setTimeout(180_000);
    await context.grantPermissions([]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error('Write permission denied')),
        },
      });
    });

    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120_000 });
    await page.getByTestId('share-pitch').click();
    await page.getByRole('button', { name: 'Create public link' }).click();
    await expect(page.getByTestId('share-pitch-link')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('share-pitch-copy-hint')).toContainText(/clipboard|Select/i);
    await expect(page.getByText(/Write permission denied/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Select and copy' })).toBeVisible();
  });
});
