import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/geocode-fix');
const BLEECKER = '350 Bleecker St, New York, NY 10014';
const BOULDER = '1600 Pearl St, Boulder, CO 80302';

await mkdir(OUT, { recursive: true });

async function captureBleeckerPicker(page, name) {
  await page.goto(`${BASE}/r/run?address=${encodeURIComponent(BLEECKER)}&radius=10`, {
    waitUntil: 'networkidle',
  });
  const picker = page.getByTestId('geocode-confirm');
  await picker.waitFor({ timeout: 120_000 });
  await page.getByTestId('geocode-confirm-map').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, name), fullPage: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await captureBleeckerPicker(page, 'bleecker-picker-1440.png');
} catch {
  await page
    .getByTestId('brands-to-pitch')
    .waitFor({ timeout: 120_000 })
    .catch(() => undefined);
  await page.screenshot({ path: join(OUT, 'bleecker-report-1440.png'), fullPage: false });
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await captureBleeckerPicker(mobile, 'bleecker-picker-390.png');
await mobile.close();

await page.goto(`${BASE}/r/run?address=${encodeURIComponent(BOULDER)}&radius=10`);
await page.waitForTimeout(4000);
if (await page.getByTestId('geocode-confirm').isVisible().catch(() => false)) {
  await page.screenshot({ path: join(OUT, 'boulder-geocode-1440.png'), fullPage: false });
} else {
  await page
    .getByTestId('brands-to-pitch')
    .waitFor({ timeout: 120_000 })
    .catch(() => undefined);
}
const bodyText = await page.locator('body').innerText();
if (bodyText.includes(';')) {
  console.warn('Warning: semicolon still visible in Boulder report UI');
}
await page.screenshot({ path: join(OUT, 'boulder-report-1440.png'), fullPage: false });

await browser.close();
console.log('saved to', OUT);
