#!/usr/bin/env node
/**
 * Integration 9873456: methodology tables, watchlist empty, report map legend.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:4173 OUT=docs/screenshots/design-9873456/after node scripts/design-integration-9873456-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || path.join(process.cwd(), 'docs/screenshots/design-9873456/after');
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

async function captureReportMap(page, filePath, width) {
  await page.getByTestId('brands-to-pitch').waitFor({ state: 'visible', timeout: 240_000 });
  await page.getByTestId('report-tour-hint-dismiss').click({ timeout: 5000 }).catch(() => undefined);
  const panel = page.getByTestId('report-map-panel');
  if (width === 390) {
    await panel.scrollIntoViewIfNeeded({ timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await panel.screenshot({ path: filePath, timeout: 60_000 }).catch(async () => {
      await page.screenshot({ path: filePath, fullPage: true });
    });
    return;
  }
  await panel.scrollIntoViewIfNeeded();
  await page.getByTestId('report-map-skeleton').waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const box = await panel.boundingBox();
  if (box && box.width > 40 && box.height > 40) {
    await page.screenshot({ path: filePath, clip: box });
  } else {
    await panel.screenshot({ path: filePath });
  }
}

async function capture(browser, theme, width) {
  const height = width === 390 ? 844 : 900;
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
  });
  await context.addInitScript(() => {
    localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
  });
  const page = await context.newPage();
  const dir = path.join(OUT, theme, String(width));

  await page.goto(`${BASE}/methodology`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  await page.getByTestId('methodology-page').waitFor({ timeout: 60_000 });
  await page.getByTestId('methodology-site-table-bridge').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await mkdir(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, 'methodology-eval-table.png'),
    fullPage: false,
  });

  await page.goto(`${BASE}/watchlist`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('watchlist-page').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(dir, 'watchlist-empty.png'),
    fullPage: false,
  });

  await page.goto(`${BASE}${WICKER}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  await captureReportMap(page, path.join(dir, 'report-map-legend.png'), width);

  await context.close();
  console.log('wrote', theme, width);
}

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    await capture(browser, theme, width);
  }
}
await browser.close();
console.log('saved to', OUT);
