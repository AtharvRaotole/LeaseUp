#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs/screenshots');

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(`${BASE}/methodology`, { waitUntil: 'networkidle' });
await page.locator('#pipeline-heading').waitFor();
await page.screenshot({
  path: join(OUT, 'methodology-mobile-390.png'),
  fullPage: true,
});
await browser.close();
console.log('Wrote docs/screenshots/methodology-mobile-390.png');
