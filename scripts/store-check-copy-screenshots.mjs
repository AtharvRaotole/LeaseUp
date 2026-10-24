#!/usr/bin/env node
/** Capture Why-card store absence copy (fixture-backed preview route). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '/opt/cursor/artifacts/store-check-copy';

await mkdir(OUT, { recursive: true });

async function capture(viewport, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/__preview/wicker-why-card`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  const card = page.getByTestId('why-this-brand');
  await card.waitFor({ state: 'visible', timeout: 60_000 });
  const line = page.getByTestId('why-absence-verification');
  await line.waitFor({ timeout: 30_000 });
  await card.screenshot({
    path: path.join(OUT, `${tag}-why-store-check.png`),
  });
  await browser.close();
}

await capture({ width: 1440, height: 900 }, '1440');
await capture({ width: 390, height: 844 }, '390');
console.log('Saved to', OUT);
