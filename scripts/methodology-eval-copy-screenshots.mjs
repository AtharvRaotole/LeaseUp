#!/usr/bin/env node
/**
 * Methodology page screenshots at 1440 and 390.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:4173 OUT=docs/screenshots/methodology-eval-copy node scripts/methodology-eval-copy-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || path.join(process.cwd(), 'docs/screenshots/methodology-eval-copy');

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    const height = width === 390 ? 844 : 900;
    const page = await browser.newPage({
      viewport: { width, height },
      colorScheme: theme,
    });
    await page.goto(`${BASE}/methodology`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId('methodology-page').waitFor({ timeout: 60_000 });
    await page.locator('#strict-eval-heading').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const dir = path.join(OUT, theme, String(width));
    await mkdir(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, 'methodology-page.png'),
      fullPage: true,
    });
    await page.close();
    console.log('wrote', theme, width);
  }
}
await browser.close();
console.log('saved to', OUT);
