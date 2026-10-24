import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Qloo unavailable', () => {
  test('report shows calm taste error instead of chain-size rankings', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Taste data is slow', { exact: true })).toBeVisible();
    await expect(page.getByText(/ranked by chain size only/i)).toHaveCount(0);
    await expect(page.getByTestId('brands-to-pitch').locator('li')).toHaveCount(0);
    const severe = consoleErrors.filter(
      (line) => !/favicon|404|devtools/i.test(line) && !/QLOO_UNAVAILABLE/i.test(line)
    );
    expect(severe).toEqual([]);
  });
});
