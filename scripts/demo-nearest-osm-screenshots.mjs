#!/usr/bin/env node
/** Capture demo-chip report pitch list after nearest-store reconciliation (fixture-backed demo). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT =
  process.env.OUT ||
  path.join(process.cwd(), 'docs/screenshots/demo-nearest-osm-audit');

await mkdir(OUT, { recursive: true });

async function captureReport(viewport, tag, chipPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}${chipPath}`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByTestId('brands-to-pitch').waitFor({ timeout: 60_000 });
  await page.getByTestId('brands-to-pitch').screenshot({
    path: path.join(OUT, `${tag}-brands-to-pitch.png`),
  });
  await browser.close();
}

await captureReport(
  { width: 1440, height: 900 },
  'wicker-1440',
  '/r/wicker?screenshot=1'
);
await captureReport(
  { width: 390, height: 844 },
  'wicker-390',
  '/r/wicker?screenshot=1'
);
console.log('Saved to', OUT);
