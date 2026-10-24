#!/usr/bin/env node
/**
 * PR evidence: tour hint clear of map + landing hero dark copy.
 * Usage: CAPTURE_ONLY=1 SCREENSHOT_BASE=http://127.0.0.1:PORT node scripts/pr-tour-hint-landing-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = join(process.cwd(), 'docs/screenshots/tour-hint-landing');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [1440, 1024, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(
    `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.evaluate(() => localStorage.removeItem('leaseup-report-guided-tour-v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180_000 });
  if (width === 390) {
    await page.getByRole('button', { name: 'Map' }).click();
  }
  await page.getByTestId('report-first-run-tour-hint').waitFor({ timeout: 120_000 });
  await page.screenshot({ path: join(OUT, `report-tour-hint-${width}.png`), fullPage: false });
  console.log('wrote', `report-tour-hint-${width}.png`);
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByTestId('landing-hero-product-preview').waitFor({ timeout: 30_000 });
  await page.getByTestId('landing-hero-preview-frame').screenshot({
    path: join(OUT, 'landing-hero-dark-390.png'),
  });
  console.log('wrote', 'landing-hero-dark-390.png');
  await context.close();
}

await browser.close();
