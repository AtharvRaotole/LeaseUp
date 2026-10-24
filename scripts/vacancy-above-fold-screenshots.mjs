#!/usr/bin/env node
/**
 * Screenshots: vacancy calculator above pitch list on Boulder demo report.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/screenshots/vacancy-above-fold');
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8797';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4185';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;
const BOULDER = `/r/boulder?address=${encodeURIComponent('1300 Pearl St, Boulder, CO 80302')}&radius=10&screenshot=1`;

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

async function waitFor(url) {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out ${url}`);
}

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/worker build');
run('pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql');
run('pnpm --filter @leaseup/web build', { env: { ...process.env, VITE_API_URL: BASE } });

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

try {
  await waitFor(`http://127.0.0.1:${WORKER_PORT}/api/health`);
  await waitFor(BASE);
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}${BOULDER}`, { waitUntil: 'networkidle' });
  await page.getByTestId('brands-to-pitch').waitFor({ timeout: 120_000 });
  await page.getByTestId('vacancy-above-fold').screenshot({
    path: join(OUT, 'vacancy-prompt-1440.png'),
  });

  await page.getByTestId('vacancy-above-sqft').fill('2500');
  await page.getByTestId('vacancy-above-rent').fill('48');
  await page.getByTestId('vacancy-monthly-headline').waitFor();
  await page.getByTestId('vacancy-above-fold').screenshot({
    path: join(OUT, 'vacancy-headline-1440.png'),
  });

  await browser.close();
  console.log(`Wrote screenshots to ${OUT}`);
} finally {
  worker.kill('SIGTERM');
  preview.kill('SIGTERM');
}
