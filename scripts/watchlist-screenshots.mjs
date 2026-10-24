#!/usr/bin/env node
/**
 * Capture watchlist UI screenshots at 1440 and 390 widths (demo fixtures).
 */
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/screenshots/features/watchlist');
mkdirSync(OUT, { recursive: true });

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/worker build');
run(
  'pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql'
);
const WORKER_PORT = process.env.WATCHLIST_SHOT_WORKER_PORT || '8793';
const PREVIEW_PORT = process.env.WATCHLIST_SHOT_PREVIEW_PORT || '4181';
const base = `http://127.0.0.1:${PREVIEW_PORT}`;

run('pnpm --filter @leaseup/web build', {
  env: { ...process.env, VITE_API_URL: base },
});

const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', WORKER_PORT, '--local'],
  {
    cwd: ROOT,
    env: { ...process.env, APP_MODE: 'demo', WRANGLER_SEND_ERROR_REPORTS: 'false', CI: 'true' },
    stdio: 'inherit',
  }
);

const preview = spawn(
  'pnpm',
  [
    '--filter',
    '@leaseup/web',
    'exec',
    'vite',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    PREVIEW_PORT,
    '--strictPort',
  ],
  {
    cwd: ROOT,
    env: { ...process.env, CSP_E2E_WORKER_PORT: WORKER_PORT, CSP_E2E_LOCAL: '1' },
    stdio: 'inherit',
  }
);

async function waitFor(url) {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

async function capture() {
  await waitFor(`http://127.0.0.1:${WORKER_PORT}/api/health`);
  await waitFor(`${base}/`);

  for (const width of [1440, 390]) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${base}${WICKER}`);
    await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
    await page.getByTestId('watch-this-space').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(OUT, `report-watch-button-${width}.png`),
    });

    await page.getByTestId('watch-this-space').click();
    await page.getByTestId('watch-saved-link').waitFor({ timeout: 30_000 });
    await page.getByTestId('watch-saved-link').click();
    await page.getByTestId('watchlist-page').waitFor();
    await page.screenshot({ path: join(OUT, `watchlist-detail-first-check-${width}.png`) });

    await page.goto(`${base}/__preview/watchlist-diff`);
    await page.getByTestId('watchlist-diff-preview').waitFor();
    await page.screenshot({ path: join(OUT, `watchlist-diff-demo-${width}.png`) });

    await browser.close();
  }
}

try {
  await capture();
} finally {
  worker.kill('SIGTERM');
  preview.kill('SIGTERM');
}
