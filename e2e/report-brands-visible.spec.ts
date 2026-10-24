import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

for (const viewport of [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const) {
  test(`brands-to-pitch is visible on report at ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(WICKER, { waitUntil: 'networkidle' });
    await waitForReportReady(page);
    const pitch = page.getByTestId('brands-to-pitch');
    await expect(pitch).toBeVisible({ timeout: 90_000 });
    await expect(pitch.getByTestId('report-top-brands-list').locator('li').first()).toBeVisible();
  });
}
