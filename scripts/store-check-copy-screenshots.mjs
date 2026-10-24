#!/usr/bin/env node
/** Capture why-card store check line on fixture-backed Wicker report preview. */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '/opt/cursor/artifacts/store-check-copy';

await mkdir(OUT, { recursive: true });

async function capture(viewport, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('LandingHeroProductPreview') && r.status() === 200,
      { timeout: 120_000 }
    ),
    page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 }),
  ]);
  const preview = page.getByTestId('landing-hero-product-preview');
  await preview.waitFor({ state: 'visible', timeout: 60_000 });
  const target = preview.getByTestId('landing-hero-preview-frame');
  await target.waitFor({ timeout: 60_000 });
  await target.screenshot({
    path: path.join(OUT, `${tag}-store-check-copy.png`),
  });
  await browser.close();
}

await capture({ width: 1440, height: 900 }, '1440');
await capture({ width: 390, height: 844 }, '390');
console.log('Saved to', OUT);
