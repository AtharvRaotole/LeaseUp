#!/usr/bin/env node
/** Capture chromeless report map raster for landing hero fallback (dark default). */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT_DIR = join(process.cwd(), 'apps/web/public/demo');
const WICKER =
  '/r/wicker?address=1560%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
for (const theme of ['dark', 'light']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    },
    { key: 'leaseup-theme', value: theme }
  );
  await page.goto(`${BASE}${WICKER}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await page.getByTestId('report-tour-hint-dismiss').click({ timeout: 3000 }).catch(() => undefined);
  const map = page.getByTestId('report-map');
  await map.waitFor({ timeout: 120_000 });
  await page.waitForTimeout(theme === 'dark' ? 3500 : 2500);
  const png = await map.screenshot({ type: 'png' });
  const out = join(OUT_DIR, `landing-hero-map-${theme}.jpg`);
  await sharp(png).jpeg({ quality: 88 }).toFile(out);
  console.log('wrote', out);
}
await browser.close();
