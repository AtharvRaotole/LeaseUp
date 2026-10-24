import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

test.describe('Watchlist promote flow', () => {
  test('add, recheck, rate-limited recheck, and remove', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto(WICKER);
    await waitForReportReady(page);

    await page.getByTestId('watch-this-space').click();
    await expect(page.getByTestId('watch-saved-link')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('watch-saved-link').click();
    await expect(page.getByTestId('watchlist-page')).toBeVisible();
    await expect(page.getByTestId('watch-diff-panel')).toContainText('First check saved');

    const firstRecheck = page.waitForResponse(
      (res) => res.url().includes('/recheck') && res.request().method() === 'POST'
    );
    await page.getByTestId('watch-recheck').click();
    const firstResponse = await firstRecheck;
    expect(firstResponse.ok(), `first recheck status ${firstResponse.status()}`).toBeTruthy();

    await expect(page.getByTestId('watch-diff-panel')).toContainText(
      /No changes in the top 10 since your last check|Changes since your last check/,
      { timeout: 30_000 }
    );

    const secondRecheck = page.waitForResponse(
      (res) => res.url().includes('/recheck') && res.request().method() === 'POST'
    );
    await page.getByTestId('watch-recheck').click();
    const secondResponse = await secondRecheck;
    expect(secondResponse.status(), 'second recheck should be rate limited').toBe(429);
    await expect(page.getByRole('alert')).toContainText(/Wait before rechecking|Daily recheck limit/i);

    const removeResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/watchlist/') &&
        res.request().method() === 'DELETE' &&
        res.status() === 200
    );
    await page.getByTestId('watch-remove').click();
    await removeResponse;

    await expect(page.getByTestId('watchlist-empty')).toBeVisible({ timeout: 15_000 });
  });
});
