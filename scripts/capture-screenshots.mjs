/**
 * Capture README screenshots from the running demo stack.
 * Prereq: worker on :8787 (APP_MODE=demo) and web preview on :4173
 *   pnpm --filter @leaseup/worker dev
 *   pnpm --filter @leaseup/web build && pnpm --filter @leaseup/web preview --port 4173
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs');

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, 'hero-landing.png'), fullPage: true });

try {
  await page.goto(`${BASE}?demo=wicker`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=We hid the stores', { timeout: 25000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, 'demo-wicker-results.png'), fullPage: true });
  console.log('Saved docs/demo-wicker-results.png');
} catch (err) {
  console.warn('Results screenshot skipped:', err?.message || err);
}

await browser.close();
console.log('Saved docs/hero-landing.png');
