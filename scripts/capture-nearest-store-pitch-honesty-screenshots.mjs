#!/usr/bin/env node
/**
 * Pitch page screenshots: stale saved km reconciled on serve (American Eagle, Wicker).
 *
 *   node scripts/capture-nearest-store-pitch-honesty-screenshots.mjs
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const OUT =
  process.env.SCREENSHOT_OUT ||
  join(repoRoot, 'docs/screenshots/nearest-store-pitch-honesty');
const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const PITCH_ID = '7255de71-0000-4000-8000-000000000001';

mkdirSync(OUT, { recursive: true });

execSync(
  'pnpm --filter @leaseup/worker exec vitest run src/__tests__/pitch-honesty-screenshot-fixture.test.ts',
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, EXPORT_PITCH_HONESTY_FIXTURE: '1' },
  }
);

const snapshot = JSON.parse(
  readFileSync(
    join(repoRoot, 'apps/web/e2e/fixtures/wicker-american-eagle-pitch-refreshed.json'),
    'utf8'
  )
);

const browser = await chromium.launch();
const page = await browser.newPage();

await page.route(`**/api/pitch/${PITCH_ID}`, async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
});

async function shot(name, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}/pitch/${PITCH_ID}`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByTestId('pitch-page').waitFor({ timeout: 60_000 });
  await page.getByText('American Eagle').first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, name), fullPage: true });
}

await shot('pitch-honesty-1440.png', { width: 1440, height: 900 });
await shot('pitch-honesty-390.png', { width: 390, height: 844 });

await browser.close();
console.log('Saved screenshots to', OUT);
