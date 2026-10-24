import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const DEMO_BRAND = '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E';

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflows = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > window.innerWidth + 1;
  });
  expect(overflows).toBe(false);
}

test.describe('Mobile layout (390px) has no horizontal overflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('landing', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await assertNoHorizontalOverflow(page);
  });

  test('site report', async ({ page }) => {
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await assertNoHorizontalOverflow(page);
  });

  test('brand reverse', async ({ page }) => {
    await page.goto(`${BASE}/brand/${DEMO_BRAND}?metro=chicago`);
    await page.getByTestId('brand-opportunities').waitFor({ timeout: 90000 });
    await assertNoHorizontalOverflow(page);
  });

  test('pipeline', async ({ page }) => {
    await page.goto(`${BASE}/pipeline`);
    await page.getByTestId('pipeline-page').waitFor({ timeout: 30000 });
    await assertNoHorizontalOverflow(page);
  });

  test('portfolio', async ({ page }) => {
    await page.goto(`${BASE}/portfolio`);
    await page.getByTestId('portfolio-input').waitFor({ timeout: 30000 });
    await assertNoHorizontalOverflow(page);
  });

  test('pitch pack', async ({ page }) => {
    const api = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8787';
    const analyzeRes = await fetch(`${api}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: WICKER, radius: 10 }),
    });
    const results = await analyzeRes.json();
    const pitchRes = await fetch(`${api}/api/pitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, radiusKm: 10 }),
    });
    const pitch = (await pitchRes.json()) as { id: string };
    await page.goto(`${BASE}/pitch/${pitch.id}`);
    await page.getByTestId('pitch-page').waitFor({ timeout: 30000 });
    await assertNoHorizontalOverflow(page);
  });
});
