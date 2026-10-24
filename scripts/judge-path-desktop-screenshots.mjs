#!/usr/bin/env node
/**
 * Judge-path desktop screenshots at 1440 (light + dark).
 * Usage: OUT=docs/screenshots/judge-1440/before SCREENSHOT_BASE=http://127.0.0.1:4181 node scripts/judge-path-desktop-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '';
const WICKER = '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';
const BRAND = '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago';

const ROUTES = [
  { name: 'landing', path: '/', wait: 'landing-hero-product-preview' },
  { name: 'report-wicker', path: WICKER, wait: 'brands-to-pitch', tourDismiss: true },
  { name: 'demo-pitch', path: '/pitch/demo-boulder-ulta', wait: 'pitch-page' },
  { name: 'pipeline', path: '/pipeline', wait: 'pipeline-page' },
  { name: 'methodology', path: '/methodology', wait: 'methodology-page' },
  { name: 'brand', path: BRAND, wait: 'brand-opportunities' },
  { name: 'portfolio', path: '/portfolio', wait: 'portfolio-input' },
];

async function capture(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    if (route.wait) {
      await page.getByTestId(route.wait).waitFor({ state: 'visible', timeout: 180_000 }).catch(() => {});
    }
    if (route.tourDismiss) {
      const dismiss = page.getByTestId('report-tour-hint-dismiss');
      if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    }
    if (route.name === 'report-wicker') {
      await page.getByTestId('report-top-brands-list').locator('li').first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    if (OUT) {
      const dir = path.join(OUT, theme);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${route.name}.png`), fullPage: true });
      console.log('wrote', theme, route.name);
    }
  }
  await context.close();
}

const browser = await chromium.launch();
await capture(browser, 'light');
await capture(browser, 'dark');
await browser.close();
