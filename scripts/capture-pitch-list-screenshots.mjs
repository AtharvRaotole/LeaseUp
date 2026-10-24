#!/usr/bin/env node
/** Capture demo pitch list (fixture-seeded, no worker). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '/opt/cursor/artifacts/pitch-list-verified';

await mkdir(OUT, { recursive: true });

async function capture(viewport, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/pitch/demo-boulder-ulta`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByTestId('pitch-page').waitFor({ timeout: 60_000 });
  await page.getByText('Your list #1').waitFor({ timeout: 30_000 });
  await page.getByTestId('pitch-pack-brief').screenshot({
    path: path.join(OUT, `${tag}-pitch-list.png`),
  });
  await browser.close();
}

await capture({ width: 1440, height: 900 }, '1440');
await capture({ width: 390, height: 844 }, '390');
console.log('Saved to', OUT);
