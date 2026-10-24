#!/usr/bin/env node
/** Pitch freshness + non-happy path screenshots (offline preview routes). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '/opt/cursor/artifacts/pitch-freshness';

const CAPTURES = [
  { path: '/pitch/demo-boulder-ulta', wait: 'pitch-freshness-label', tag: 'pitch-freshness' },
  { path: '/__preview/pitch-unavailable', wait: 'pitch-error', tag: 'pitch-unavailable' },
  { path: '/__preview/watchlist-empty', wait: 'watchlist-empty', tag: 'watchlist-empty' },
];

await mkdir(OUT, { recursive: true });

async function shot(page, viewport, tag) {
  await page.setViewportSize(viewport);
  for (const cap of CAPTURES) {
    await page.goto(`${BASE}${cap.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId(cap.wait).waitFor({ state: 'visible', timeout: 60_000 });
    const suffix = viewport.width === 390 ? '390' : '1440';
    await page.screenshot({
      path: path.join(OUT, `${cap.tag}-${suffix}.png`),
      fullPage: true,
    });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await shot(page, { width: 1440, height: 900 });
await shot(page, { width: 390, height: 844 });
await browser.close();
console.log('Saved to', OUT);
