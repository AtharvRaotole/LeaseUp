#!/usr/bin/env node
/**
 * Renders hero preview AVIF/WebP from the fixture capture route.
 * Prereq: built web + preview on SCREENSHOT_BASE (default :4173).
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = join(process.cwd(), 'apps/web/src/assets/landing-hero');

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 800, height: 520 } });
const page = await context.newPage();

for (const theme of ['light', 'dark']) {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${BASE}/__preview/landing-hero`, { waitUntil: 'networkidle' });
  await page.getByTestId('landing-hero-preview-frame').waitFor({ timeout: 30_000 });
  const shell = page.locator('#landing-hero-capture-shell');
  const png = await shell.screenshot({ type: 'png' });
  const base = join(OUT, `hero-wicker-${theme}`);
  await sharp(png)
    .resize(720, 400, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(`${base}.webp`);
  await sharp(png)
    .resize(720, 400, { fit: 'cover', position: 'top' })
    .avif({ quality: 55 })
    .toFile(`${base}.avif`);
  console.log('wrote', `landing/hero-wicker-${theme}.webp`, `landing/hero-wicker-${theme}.avif`);
}

await browser.close();
