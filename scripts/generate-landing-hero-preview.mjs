#!/usr/bin/env node
/**
 * Renders hero preview AVIF/WebP from the fixture capture route (content only, no chrome).
 * Prereq: built web + preview on SCREENSHOT_BASE (default :4173).
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = join(process.cwd(), 'apps/web/src/assets/landing-hero');

/** CSS width of capture frame; deviceScaleFactor 2 → 1280px raster. */
const CAPTURE_CSS_WIDTH = 640;
const OUTPUT_WIDTH = CAPTURE_CSS_WIDTH * 2;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: CAPTURE_CSS_WIDTH + 32, height: 420 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

for (const theme of ['light', 'dark']) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    },
    { key: 'leaseup-theme', value: theme }
  );
  await page.goto(`${BASE}/__preview/landing-hero`, { waitUntil: 'networkidle' });
  const frame = page.getByTestId('landing-hero-preview-frame');
  await frame.waitFor({ timeout: 30_000 });
  const png = await frame.screenshot({ type: 'png' });
  const meta = await sharp(png).metadata();
  const outputHeight = Math.round((OUTPUT_WIDTH / meta.width) * meta.height);
  const base = join(OUT, `hero-wicker-${theme}`);
  await sharp(png)
    .resize(OUTPUT_WIDTH, outputHeight, { fit: 'inside' })
    .webp({ quality: 86 })
    .toFile(`${base}.webp`);
  await sharp(png)
    .resize(OUTPUT_WIDTH, outputHeight, { fit: 'inside' })
    .avif({ quality: 62 })
    .toFile(`${base}.avif`);
  console.log(
    'wrote',
    `hero-wicker-${theme}.webp`,
    `hero-wicker-${theme}.avif`,
    `${OUTPUT_WIDTH}×${outputHeight}`
  );
}

await browser.close();
