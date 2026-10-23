/**
 * Screenshots for brand reverse and portfolio pages.
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs/screenshots/features');

const API = process.env.SCREENSHOT_API || 'http://localhost:8787';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

let pitchPath = process.env.PITCH_SCREENSHOT_PATH;
if (!pitchPath) {
  const analyzeRes = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${API}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  const pitch = await pitchRes.json();
  pitchPath = `/pitch/${pitch.id}`;
  console.log('pitch screenshot path', pitchPath);
}

const prospectRes = await fetch(`${API}/api/prospecting`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: WICKER, radius: 10 }),
});
const prospectJob = await prospectRes.json();
const prospectPath = `/prospect/${prospectJob.id}`;
console.log('prospect screenshot path', prospectPath);

const pages = [
  {
    name: 'report-qloo-proof',
    path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`,
    testId: 'qloo-proof-banner',
    timeout: 120000,
  },
  { name: 'brand-reverse', path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E', testId: 'brand-opportunities' },
  { name: 'portfolio', path: '/portfolio', testId: 'portfolio-input' },
  { name: 'pitch-pack', path: pitchPath, testId: 'pitch-page' },
  { name: 'prospecting-agent', path: prospectPath, testId: 'prospecting-page', timeout: 240000, extraTestId: 'pitch-pack-ready' },
  {
    name: 'pipeline',
    path: '/pipeline',
    testId: 'pipeline-page',
    timeout: 120000,
    prepare: async (page) => {
      await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
      await page.getByTestId('brands-to-pitch').waitFor({ timeout: 120000 });
      const firstBrand = page.getByTestId('brands-to-pitch').locator('button').first();
      await firstBrand.click();
      await page.getByTestId('add-to-pipeline').first().click();
      await page.getByText('Added to pipeline').waitFor({ timeout: 30000 });
      await page.goto(`${BASE}/pipeline`);
    },
  },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    for (const pageDef of pages) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      if (pageDef.prepare) {
        await pageDef.prepare(page);
      } else {
        await page.goto(`${BASE}${pageDef.path}`, { waitUntil: 'networkidle' });
      }
      const waitMs = pageDef.timeout ?? 90000;
      if (pageDef.testId) {
        await page.getByTestId(pageDef.testId).waitFor({ timeout: waitMs });
      }
      if (pageDef.extraTestId) {
        await page.getByRole('link', { name: 'Open pitch pack' }).waitFor({ timeout: waitMs });
      }
      await page.waitForTimeout(800);
      const file = `${pageDef.name}-${theme}-${width}.png`;
      await page.screenshot({ path: join(OUT, file), fullPage: true });
      console.log('saved', join(OUT, file));
      await context.close();
    }
  }
}

await browser.close();
