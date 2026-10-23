/**
 * Screenshots for loading, empty, and error states (local preview + demo worker).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT =
  process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/non-happy-path/after');

const EMPTY_BOARD = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  shareId: '00000000-0000-4000-8000-000000000002',
  cards: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/no-such-page`);
await page.getByTestId('not-found-page').waitFor({ timeout: 30_000 });
await page.screenshot({ path: join(OUT, 'not-found-1440.png'), fullPage: true });

await page.route('**/api/pipeline', async (route) => {
  if (route.request().method() !== 'GET') {
    await route.continue();
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify(EMPTY_BOARD),
  });
});
await page.goto(`${BASE}/pipeline`);
await page.getByTestId('pipeline-empty').waitFor({ timeout: 30_000 });
await page.screenshot({ path: join(OUT, 'pipeline-empty-1440.png'), fullPage: true });

await page.goto(`${BASE}/portfolio`);
await page.getByTestId('portfolio-empty-state').waitFor({ timeout: 30_000 });
await page.screenshot({ path: join(OUT, 'portfolio-empty-1440.png'), fullPage: true });

await page.goto(`${BASE}/pitch/00000000-0000-4000-8000-000000000099`);
await page.getByTestId('pitch-error').waitFor({ timeout: 30_000 });
await page.screenshot({ path: join(OUT, 'pitch-share-expired-1440.png'), fullPage: true });

await browser.close();
console.log('saved to', OUT);
