#!/usr/bin/env node
/**
 * Devpost gallery screenshots (local stack only by default; avoids prod KV writes).
 * 1600x1000, light mode, no browser chrome.
 *
 *   pnpm capture:devpost:local
 *   MEDIA_CAPTURE_ALLOW_PROD=1 ... # after KV reset only
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertLocalMediaCapture } from './media-capture-guard.mjs';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const API = (process.env.SCREENSHOT_API || 'http://127.0.0.1:8787').replace(/\/$/, '');
assertLocalMediaCapture(BASE, API);
const WORKER_HOST = new URL(API).hostname;
const OUT = join(process.cwd(), 'docs/media/devpost');
const WICKER = process.env.SCREENSHOT_WICKER || '1560 N Milwaukee Ave, Chicago, IL 60622';
const VIEWPORT = { width: 1600, height: 1000 };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissReportChrome(page) {
  const tourDismiss = page.getByTestId('report-tour-dismiss');
  if (await tourDismiss.isVisible().catch(() => false)) {
    await tourDismiss.click();
    await pause(300);
  }
  const demoDismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await demoDismiss.isVisible().catch(() => false)) {
    await demoDismiss.click();
    await pause(200);
  }
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, type: 'png' });
  return path;
}

async function fetchWithRetry(url, init, label, attempts = 5) {
  let lastStatus = 0;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, init);
    lastStatus = res.status;
    if (res.ok) return res;
    if (res.status >= 500 && i < attempts - 1) {
      await pause(2000 * (i + 1));
      continue;
    }
    throw new Error(`${label} failed: ${res.status}`);
  }
  throw new Error(`${label} failed: ${lastStatus}`);
}

async function fetchPitchPath() {
  const analyzeRes = await fetchWithRetry(
    `${API}/api/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: WICKER, radius: 10 }),
    },
    'analyze'
  );
  const results = await analyzeRes.json();
  const pitchRes = await fetchWithRetry(
    `${API}/api/pitch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, radiusKm: 10 }),
    },
    'pitch'
  );
  const pitch = await pitchRes.json();
  return `/pitch/${pitch.id}`;
}

await mkdir(OUT, { recursive: true });

const pitchPath = await fetchPitchPath();
const reportPath = `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`;

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-features=ThirdPartyCookiePhaseout'],
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  colorScheme: 'light',
});
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
const page = await context.newPage();

const manifest = { capturedAt: new Date().toISOString(), baseUrl: BASE, files: [] };

await page.goto(BASE, { waitUntil: 'networkidle' });
await pause(800);
manifest.files.push({ name: '01-landing', path: await shot(page, '01-landing') });

await page.goto(`${BASE}${reportPath}`, { waitUntil: 'domcontentloaded' });
await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180000 });
await page.getByTestId('qloo-proof-banner').waitFor({ timeout: 60000 });
await dismissReportChrome(page);
await pause(600);
manifest.files.push({ name: '02-report', path: await shot(page, '02-report') });

const firstBrand = page.getByTestId('brands-to-pitch').locator('button').first();
await firstBrand.click();
await page.getByTestId('why-this-brand').waitFor({ state: 'visible', timeout: 30000 });
const why = page.getByTestId('why-this-brand').first();
await why.scrollIntoViewIfNeeded();
await pause(500);
manifest.files.push({ name: '03-why-card', path: await shot(page, '03-why-card') });

await page.goto(`${BASE}${pitchPath}`, { waitUntil: 'domcontentloaded' });
await page.getByTestId('pitch-page').waitFor({ timeout: 90000 });
await pause(700);
manifest.files.push({ name: '04-pitch-pack', path: await shot(page, '04-pitch-pack') });

await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' });
const empty = page.getByTestId('pipeline-empty');
const board = page.getByTestId('pipeline-board');
if (await empty.isVisible().catch(() => false)) {
  await page.goto(`${BASE}${reportPath}`);
  await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180000 });
  await dismissReportChrome(page);
  await page.getByTestId('brands-to-pitch').locator('button').first().click();
  const save = page.waitForResponse(
    (r) =>
      r.url().includes('/api/pipeline/cards') &&
      r.request().method() === 'POST' &&
      r.ok(),
    { timeout: 90000 }
  );
  await page.locator('[data-testid="add-to-pipeline"]:visible').first().click();
  const saveRes = await save;
  const savedBoard = await saveRes.json();
  await context.addCookies([
    {
      name: 'leaseup_pipeline_ws',
      value: savedBoard.workspaceId,
      domain: WORKER_HOST,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto(`${BASE}/pipeline`);
  await page.waitForResponse(
    (r) => r.url().includes('/api/pipeline') && r.request().method() === 'GET' && r.ok(),
    { timeout: 90000 }
  );
}
await board.or(page.getByTestId('pipeline-empty')).first().waitFor({ timeout: 90000 });
if (await page.getByTestId('pipeline-empty').isVisible().catch(() => false)) {
  throw new Error('Pipeline empty; could not seed a card for screenshot.');
}
await board.waitFor({ timeout: 60000 });
await page.getByTestId('pipeline-card').first().waitFor({ timeout: 60000 });
await pause(600);
manifest.files.push({ name: '05-pipeline', path: await shot(page, '05-pipeline') });

await page.goto(`${BASE}/methodology`, { waitUntil: 'domcontentloaded' });
await page.locator('#pipeline-heading').waitFor({ timeout: 30000 });
await page.locator('#pipeline-heading').scrollIntoViewIfNeeded();
await pause(500);
manifest.files.push({ name: '06-methodology', path: await shot(page, '06-methodology') });

await browser.close();

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Devpost screenshots written to', OUT);
