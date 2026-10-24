import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Report map layout', () => {
  test('map canvas is taller than 200px after lazy load', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    const map = page.locator('.maplibregl-map').first();
    await expect(map).toBeVisible({ timeout: 60_000 });
    const box = await map.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(200);
  });
});
