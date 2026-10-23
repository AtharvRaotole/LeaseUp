#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), '/opt/cursor/artifacts/screenshots');

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BOULDER = '1300 Pearl St, Boulder, CO 80302';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(page, name) {
  const file = join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
}

for (const [slug, address, prefix] of [
  ['wicker', WICKER, 'wicker'],
  ['boulder', BOULDER, 'boulder'],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.addInitScript(() => {
    localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
  });
  await page.goto(
    `${BASE}/r/${slug}?address=${encodeURIComponent(address)}&radius=10&screenshot=1`,
    { waitUntil: 'networkidle' }
  );
  await page.locator('[data-testid="qloo-proof-banner"]').waitFor({ timeout: 120_000 });
  await shot(page, `${prefix}-qloo-proof-card.png`);
  await page.locator('[data-testid="brands-to-pitch"]').waitFor();
  await page.locator('[data-testid="brands-to-pitch"]').scrollIntoViewIfNeeded();
  await shot(page, `${prefix}-brand-list.png`);
  await page.close();
}

const meth = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await meth.goto(`${BASE}/methodology`, { waitUntil: 'networkidle' });
await meth.locator('#adaptive-eval-heading').scrollIntoViewIfNeeded();
await shot(meth, 'methodology-adaptive-eval.png');
await meth.close();

await browser.close();
