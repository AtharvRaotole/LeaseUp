#!/usr/bin/env node
/**
 * Judge-path mobile audit: overflow + small tap targets. Optional screenshots.
 * Usage: OUT=docs/screenshots/mobile-polish/before node scripts/mobile-judge-audit.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '';
const WICKER = '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';
const BOULDER = '/r/boulder?address=1300%20Pearl%20St%2C%20Boulder%2C%20CO%2080302&radius=10';
const BRAND = '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago';

const ROUTES = [
  { name: 'landing', path: '/', wait: 'landing-hero-product-preview' },
  { name: 'report-wicker', path: WICKER, wait: 'brands-to-pitch', tourDismiss: true },
  { name: 'report-boulder', path: BOULDER, wait: 'brands-to-pitch', tourDismiss: true },
  { name: 'demo-pitch', path: '/pitch/demo-boulder-ulta', wait: 'pitch-page' },
  { name: 'methodology', path: '/methodology', wait: 'methodology-page' },
  { name: 'pipeline', path: '/pipeline', wait: 'pipeline-page' },
  { name: 'watchlist', path: '/watchlist', wait: 'watchlist-page' },
  { name: 'portfolio', path: '/portfolio', wait: 'portfolio-input' },
  { name: 'brand', path: BRAND, wait: 'brand-opportunities' },
];

async function auditPage(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const smallTargets = await page.evaluate(() => {
    const min = 44;
    const bad = [];
    for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (r.width < min || r.height < min) {
        const tid = el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.textContent?.slice(0, 40);
        bad.push({ w: Math.round(r.width), h: Math.round(r.height), tid });
      }
    }
    return bad.slice(0, 25);
  });
  return { label, overflow, smallTargets };
}

async function runTheme(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
  });
  const page = await context.newPage();
  const results = [];

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    if (route.wait) {
      await page.getByTestId(route.wait).waitFor({ state: 'visible', timeout: 120_000 }).catch(() => {});
    }
    if (route.tourDismiss) {
      const dismiss = page.getByTestId('report-tour-hint-dismiss');
      if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    }
    if (route.name === 'report-wicker') {
      await page.getByTestId('report-top-brands-list').locator('li').first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    results.push(await auditPage(page, `${theme}-${route.name}`));
    if (OUT) {
      const dir = path.join(OUT, theme);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${route.name}.png`), fullPage: true });
    }
  }
  await context.close();
  return results;
}

const browser = await chromium.launch();
const light = await runTheme(browser, 'light');
const dark = await runTheme(browser, 'dark');
await browser.close();

const report = { light, dark };
console.log(JSON.stringify(report, null, 2));
if (OUT) {
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 2));
}
