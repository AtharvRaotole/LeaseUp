#!/usr/bin/env node
/**
 * PR evidence: inline tour hint + report at 1440/1024/390.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:PORT node scripts/pr-tour-hint-landing-screenshots.mjs
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
  await page.getByTestId('report-first-run-tour-hint').waitFor({ timeout: 120_000 });

  const layout = await page.evaluate(() => {
    const hint = document.querySelector('[data-testid="report-first-run-tour-hint"]');
    const brands = document.querySelector('[data-testid="brands-to-pitch"]');
    if (!hint || !brands) return { error: 'missing elements' };
    const hintRect = hint.getBoundingClientRect();
    const brandsRect = brands.getBoundingClientRect();
    return {
      position: window.getComputedStyle(hint).position,
      hintBottom: hintRect.bottom,
      brandsTop: brandsRect.top,
    };
  });
  if (layout.error) throw new Error(layout.error);
  if (layout.position === 'fixed') {
    throw new Error(`Tour hint must be in page flow, not fixed at width ${width}`);
  }
  if (layout.hintBottom > layout.brandsTop + 4) {
    throw new Error(`Tour hint overlaps pitch list at width ${width}`);
  }

  await page.screenshot({ path: join(OUT, `report-tour-hint-${width}.png`), fullPage: false });
  console.log('wrote', `report-tour-hint-${width}.png`);
  await context.close();
}

await browser.close();
