import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BOULDER = '1125 Pearl St, Boulder, CO 80302';

test.describe('Portfolio run progress', () => {
  test('updates row status from SSE without reload while analyses run', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${BASE}/portfolio`);
    await page.getByTestId('portfolio-input').fill(`${WICKER}\n${BOULDER}`);
    await page.getByRole('button', { name: 'Geocode and analyze' }).click();
    await expect(page.getByTestId('portfolio-table')).toBeVisible({ timeout: 120_000 });

    if (await page.getByText('Needs confirmation').first().isVisible().catch(() => false)) {
      await page.getByTestId('portfolio-timeline').getByRole('button').first().click();
    }

    const run = page.getByRole('button', { name: 'Run analyses' });
    if (await run.isVisible().catch(() => false)) {
      await run.click();
    }

    await expect(page.getByText('Analyzing').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Complete').first()).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText('Complete').nth(1)).toBeVisible({ timeout: 180_000 });
  });
});
