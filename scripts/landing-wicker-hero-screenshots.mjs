#!/usr/bin/env node
/**
 * Landing hero Wicker preview at 1440 and 390.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:4173 OUT=docs/screenshots/landing-wicker-hero node scripts/landing-wicker-hero-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || path.join(process.cwd(), 'docs/screenshots/landing-wicker-hero');

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    const height = width === 390 ? 844 : 900;
    const page = await browser.newPage({
      viewport: { width, height },
      colorScheme: theme,
    });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId('landing-hero-product-preview').waitFor({ timeout: 60_000 });
    await page.getByTestId('landing-hero-preview-frame').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(500);
    const dir = path.join(OUT, theme, String(width));
    await mkdir(dir, { recursive: true });
    const hero = page.getByTestId('landing-hero-product-preview');
    await hero.screenshot({ path: path.join(dir, 'landing-hero-wicker.png') });
    await page.close();
    console.log('wrote', theme, width);
  }
}
await browser.close();
console.log('saved to', OUT);
