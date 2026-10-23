#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';
const OUT = join(process.cwd(), 'docs/screenshots');

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(`${BASE}${WICKER}`, { waitUntil: 'networkidle' });
await page.locator('[data-testid="brands-to-pitch"]').first().waitFor({ timeout: 120_000 });
await page.screenshot({ path: join(OUT, 'report-layout-1440.png'), fullPage: false });
await browser.close();
console.log('Wrote docs/screenshots/report-layout-1440.png');
