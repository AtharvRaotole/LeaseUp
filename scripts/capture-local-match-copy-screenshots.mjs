#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || 'docs/screenshots/local-match-copy';
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

const browser = await chromium.launch();
for (const { width, height, name } of [
  { width: 1440, height: 900, name: '1440' },
  { width: 390, height: 844, name: '390' },
]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: theme,
    });
    await context.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${WICKER}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180_000 });
    const dismiss = page.getByTestId('report-tour-hint-dismiss');
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    const fullList = page.getByTestId('brands-to-pitch-full-list');
    if (await fullList.isVisible().catch(() => false)) {
      await fullList.scrollIntoViewIfNeeded();
    } else {
      await page.getByTestId('report-top-brands-list').scrollIntoViewIfNeeded();
    }
    const dir = path.join(OUT, theme);
    await mkdir(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `report-wicker-pitch-rows-${name}.png`),
      fullPage: true,
    });
    console.log('wrote', theme, name);
    await context.close();
  }
}
await browser.close();
