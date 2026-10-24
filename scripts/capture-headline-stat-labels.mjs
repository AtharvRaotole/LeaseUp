#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || 'docs/screenshots/headline-stat-labels';
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';
const WIDTHS = [360, 390, 1440];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 2,
    });
    await context.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${WICKER}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId('report-summary').waitFor({ state: 'visible', timeout: 120_000 });
    const dismiss = page.getByTestId('report-tour-hint-dismiss');
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    const box = await page.getByTestId('report-summary').boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, `report-summary-${width}.png`),
        clip: {
          x: Math.max(0, box.x - 8),
          y: Math.max(0, box.y - 8),
          width: Math.min(width, box.width + 16),
          height: box.height + 16,
        },
      });
    }
    await context.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
