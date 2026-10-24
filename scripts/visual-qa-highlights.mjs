/**
 * Five highlight crops for visual QA before/after.
 * OUT_SUBDIR=before|after
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const sub = process.env.OUT_SUBDIR || 'after';
const OUT = join(process.cwd(), 'docs/screenshots/visual-qa/highlights', sub);
const WICKER = '1560 N Milwaukee Ave, Chicago, IL 60622';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(page, file, clip) {
  await page.screenshot({ path: join(OUT, file), clip });
  console.log('wrote', join(sub, file));
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => document.documentElement.classList.add('screenshot-capture'));

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.getByTestId('landing-plain-summary').waitFor();
await page.evaluate(() => {
  document.getElementById('how-it-works')?.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(500);
await shot(page, '01-landing-how-it-works-1440.png', { x: 0, y: 520, width: 1440, height: 520 });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await shot(page, '02-landing-hero-touch-390.png', { x: 0, y: 200, width: 390, height: 420 });

await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
await shot(page, '03-pipeline-table-labels-dark-1024.png', { x: 0, y: 120, width: 1024, height: 480 });

await page.emulateMedia({ colorScheme: 'light' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await shot(page, '04-landing-footer-1440.png', { x: 360, y: 480, width: 720, height: 200 });

const q = new URLSearchParams({ address: WICKER, radius: '10', screenshot: '1' });
await page.goto(`${BASE}/r/wicker?${q}`, { waitUntil: 'domcontentloaded' });
await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
await page.getByTestId('report-section-vacancy-costs').scrollIntoViewIfNeeded();
await shot(page, '05-report-section-copy-1440.png', { x: 80, y: 380, width: 720, height: 280 });

await browser.close();
