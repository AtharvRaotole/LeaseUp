#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.OUT || 'docs/screenshots/judge-1440/after';

const ROUTES = [
  { name: 'pipeline', path: '/pipeline', wait: 'pipeline-page' },
  { name: 'portfolio', path: '/portfolio', wait: 'portfolio-input' },
];

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  await context.addInitScript(() => {
    localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
  });
  const page = await context.newPage();
  const dir = path.join(OUT, theme);
  await mkdir(dir, { recursive: true });
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId(route.wait).waitFor({ state: 'visible', timeout: 120_000 });
    await page.screenshot({ path: path.join(dir, `${route.name}.png`), fullPage: true });
    console.log('wrote', theme, route.name);
  }
  await context.close();
}
await browser.close();
