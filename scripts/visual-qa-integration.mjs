#!/usr/bin/env node
/**
 * Offline visual QA on local preview + demo worker.
 * Exits non-zero on copy/layout assertions; writes screenshots under docs/screenshots/visual-qa/.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = join(process.cwd(), 'docs/screenshots/visual-qa');
const HEADLINE = 'Find the right stores for your empty retail space.';
const DASH_RE = /[\u2013\u2014]/;

const DEMOS = [
  { id: 'wicker', slug: 'wicker', address: '1560 N Milwaukee Ave, Chicago, IL 60622' },
  { id: 'boulder', slug: 'boulder', address: '1300 Pearl St, Boulder, CO 80302' },
  { id: 'sevierville', slug: 'sevierville', address: '125 Collier Dr, Sevierville, TN 37862' },
];

const BRAND_ROUTES = ['/brand', `/brand/${encodeURIComponent('54617D9D-5EC7-45E0-8B7F-360DADB0FE7E')}?metro=chicago`];

const issues = [];

function record(path, message) {
  issues.push({ path, message });
  console.error(`ISSUE [${path}]: ${message}`);
}

function assertNoDashes(path, text) {
  if (DASH_RE.test(text)) {
    const match = text.match(DASH_RE);
    record(path, `contains dash character ${match?.[0]}`);
  }
}

function assertNoLeaseupApp(path, text) {
  if (/\bleaseup\.app\b/i.test(text)) {
    record(path, 'contains leaseup.app (use Pages host or generic copy)');
  }
}

function boxesIntersect(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function assertLandingHeroLayout(page, viewportLabel) {
  const input = page.getByTestId('landing-address-input');
  const analyze = page.getByTestId('landing-analyze-button');
  await input.waitFor({ state: 'visible', timeout: 15_000 });
  await analyze.waitFor({ state: 'visible', timeout: 15_000 });
  const inputBox = await input.boundingBox();
  const analyzeBox = await analyze.boundingBox();
  if (!inputBox) {
    record(viewportLabel, 'address input has no bounding box');
    return;
  }
  if (inputBox.width < 200) {
    record(viewportLabel, `address input width ${inputBox.width}px is under 200px`);
  }
  if (analyzeBox && analyzeBox.top < inputBox.bottom - 4 && boxesIntersect(inputBox, analyzeBox)) {
    record(viewportLabel, 'Analyze button overlaps address input');
  }
  const lightImg = page.getByTestId('landing-hero-preview-img-light');
  const darkImg = page.getByTestId('landing-hero-preview-img-dark');
  const heroImg = (await lightImg.isVisible()) ? lightImg : darkImg;
  await heroImg.waitFor({ state: 'visible', timeout: 15_000 });
  const nw = await heroImg.evaluate((el) =>
    el instanceof HTMLImageElement ? el.naturalWidth : 0
  );
  if (nw <= 0) {
    record(viewportLabel, 'hero preview image naturalWidth is 0');
  }
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const { width, label } of [
  { width: 1440, label: 'landing-1440' },
  { width: 390, label: 'landing-390' },
]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await assertLandingHeroLayout(page, label);
  const h1 = await page.locator('h1').first().innerText();
  if (h1.trim() !== HEADLINE) {
    record(label, `headline mismatch: "${h1.trim()}"`);
  }
  const body = await page.locator('body').innerText();
  assertNoDashes(label, body);
  assertNoLeaseupApp(label, body);
  await page.screenshot({
    path: join(OUT, `${label}-light.png`),
    fullPage: width === 390,
  });
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

for (const theme of ['dark']) {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await assertLandingHeroLayout(page, `landing-1440-${theme}`);
  const body = await page.locator('body').innerText();
  assertNoDashes('/', body);
  assertNoLeaseupApp('/', body);
  await page.screenshot({
    path: join(OUT, `landing-1440-${theme}.png`),
    fullPage: true,
  });
}

for (const demo of DEMOS) {
  const path = `/r/${demo.slug}`;
  const url = `${BASE}${path}?address=${encodeURIComponent(demo.address)}&radius=10&screenshot=1`;
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await page.getByRole('button', { name: /dismiss/i }).click({ timeout: 3000 }).catch(() => undefined);
  await page.getByTestId('report-tour-dismiss').click({ timeout: 3000 }).catch(() => undefined);
  const body = await page.locator('body').innerText();
  assertNoDashes(path, body);
  assertNoLeaseupApp(path, body);
  const reasons = await page
    .getByTestId('report-top-brands-list')
    .locator('li button span.block.text-body')
    .allInnerTexts();
  const top3 = reasons.slice(0, 3).map((t) => t.trim()).filter(Boolean);
  const unique = new Set(top3);
  if (top3.length >= 2 && unique.size < top3.length) {
    record(path, `top brand one-liners not unique: ${JSON.stringify(top3)}`);
  }
  await page.screenshot({ path: join(OUT, `report-${demo.id}-1440-light.png`), fullPage: false });
}

for (const route of BRAND_ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  assertNoDashes(route, body);
  assertNoLeaseupApp(route, body);
  const slug = route.replace(/\//g, '_').replace(/\?/g, '_');
  await page.screenshot({ path: join(OUT, `brand${slug}-1440.png`), fullPage: true });
}

await browser.close();
await writeFile(join(OUT, 'issues.json'), JSON.stringify(issues, null, 2));
if (issues.length > 0) {
  console.error(`\n${issues.length} issue(s) found. See ${OUT}/issues.json`);
  process.exit(1);
}
console.log('Visual QA passed. Screenshots in', OUT);
