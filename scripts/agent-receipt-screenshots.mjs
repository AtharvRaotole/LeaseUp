#!/usr/bin/env node
/** Agent receipt screenshots (offline preview route). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || '/opt/cursor/artifacts/agent-receipt';
const ROUTE = '/__preview/prospecting-receipt';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [suffix, viewport] of [
  ['1440', { width: 1440, height: 900 }],
  ['390', { width: 390, height: 844 }],
]) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByTestId('agent-receipt').waitFor({ state: 'visible', timeout: 60_000 });
  await page.screenshot({
    path: path.join(OUT, `agent-receipt-${suffix}.png`),
    fullPage: true,
  });
}

await browser.close();
console.log('Saved to', OUT);
