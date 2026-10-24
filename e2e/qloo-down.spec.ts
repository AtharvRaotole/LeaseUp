import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Qloo unavailable fallback', () => {
  test('report shows chain-size notice and still lists brands', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    const banner = page.getByTestId('taste-unavailable-banner');
    await expect(banner).toBeVisible({ timeout: 90_000 });
    await expect(banner).toContainText(/ranked by chain size only/i);
    await waitForReportReady(page);
    await expect(page.getByText(/taste fit/i)).toHaveCount(0);
    await expect(page.getByTestId('brands-to-pitch').locator('li').first()).toBeVisible();
    const severe = consoleErrors.filter(
      (line) => !/favicon|404|devtools/i.test(line) && !/QLOO_UNAVAILABLE/i.test(line)
    );
    expect(severe).toEqual([]);
  });
});
