import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/usability');
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const width of [1440, 390]) {
  const height = width === 390 ? 844 : 900;
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `landing-${width}.png`), fullPage: true });
  await page.goto(`${BASE}${WICKER}`, { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="brands-to-pitch"]')
    .first()
    .waitFor({ timeout: 120_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `report-wicker-${width}.png`), fullPage: false });
  await page.close();
}

await browser.close();
console.log('saved to', OUT);
