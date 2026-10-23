import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/calm-errors/after');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const AMBIGUOUS = '1574 N Milwaukee Ave, Chicago';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, name), fullPage: false });
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(
  `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&simulateError=1`
);
await page.getByTestId('report-error').waitFor({ timeout: 15_000 });
await shot(page, 'report-server-busy-1440.png');

await page.goto(`${BASE}/r/run?address=${encodeURIComponent(AMBIGUOUS)}&radius=10`);
await page.getByTestId('geocode-confirm').waitFor({ timeout: 30_000 });
await shot(page, 'geocode-picker-1440.png');

await page.setViewportSize({ width: 390, height: 844 });
await shot(page, 'geocode-picker-390.png');

await browser.close();
console.log('saved to', OUT);
