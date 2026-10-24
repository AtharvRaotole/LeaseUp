import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Report, pipeline, and watchlist loop', () => {
  test('top brand saves evidence and links back to the report', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);

    await page.getByTestId('watch-this-space').click();
    await expect(page.getByTestId('watch-saved-link')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('add-pipeline-top-0').getByTestId('add-to-pipeline').click();
    await expect(page.getByText('Added to pipeline')).toBeVisible({ timeout: 30_000 });

    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-card').first()).toBeVisible();
    await page.getByTestId('pipeline-card').first().click();
    await expect(page.getByTestId('pipeline-evidence')).toBeVisible();
    await expect(page.getByTestId('pipeline-evidence')).not.toBeEmpty();
    await expect(page.getByRole('link', { name: 'Site report' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Watched space' })).toBeVisible();
  });

  test('pipeline card persists when the browser drops cross-site cookies', async ({ page }) => {
    test.setTimeout(180_000);
    // Production web (pages.dev) and worker (workers.dev) are cross-site, so the browser
    // rejects the SameSite=Lax workspace cookie. Simulate that: strip Cookie on the way out
    // for every API call, and clear the jar before each navigation.
    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      delete headers.cookie;
      await route.continue({ headers });
    });

    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await page.getByTestId('add-pipeline-top-0').getByTestId('add-to-pipeline').click();
    await expect(page.getByText('Added to pipeline')).toBeVisible({ timeout: 30_000 });

    await page.context().clearCookies();
    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-card').first()).toBeVisible({ timeout: 30_000 });
    await page.context().clearCookies();
    await page.reload();
    await expect(page.getByTestId('pipeline-card').first()).toBeVisible({ timeout: 30_000 });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
