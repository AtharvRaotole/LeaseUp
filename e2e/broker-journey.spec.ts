import { test, expect } from '@playwright/test';
import { openReportSection, waitForReportReady } from './report-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

async function noHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflows).toBe(false);
}

test.describe('Broker journey (demo)', () => {
  test('landing search opens report with explainer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    await page.getByPlaceholder(/Street address/i).fill(WICKER);
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page).toHaveURL(/\/r\//, { timeout: 30_000 });
    await expect(page.getByTestId('report-summary')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible();
  });

  test('report to pipeline at 1440', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await page.getByTestId('report-pipeline-cta').getByTestId('add-to-pipeline').click();
    await expect(page.getByRole('button', { name: 'Added to pipeline' })).toBeVisible({
      timeout: 10_000,
    });
    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-page')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('report map tab and pitch entry at 390', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await page.getByRole('button', { name: 'Map' }).click();
    await expect(page.locator('.maplibregl-map, [data-testid="report-map-skeleton"]').first()).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Report' }).click();
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Share pitch' }).click();
    await expect(page.getByRole('button', { name: 'Create public link' })).toBeVisible();
  });

  test('loading panel shows skeleton while analyze is delayed', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/analyze**', async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await page.goto(`${BASE}/r/run?address=${encodeURIComponent(WICKER)}&radius=10`);
    const skeleton = page.getByTestId('report-loading-panel');
    await expect(skeleton).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('report-loading-skeleton')).toBeVisible();
    await expect(page.getByText('Reading local taste')).toBeVisible();
    await waitForReportReady(page);
    await expect(skeleton).toBeHidden();
  });
});
