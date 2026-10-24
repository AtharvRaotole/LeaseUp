#!/usr/bin/env node
/**
 * Above-fold report summary + top brands card (Boulder Pearl demo).
 * Usage: node scripts/report-summary-design-screenshots.mjs --phase before|after
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const phase = process.argv.includes('--phase')
  ? process.argv[process.argv.indexOf('--phase') + 1]
  : 'after';
if (phase !== 'before' && phase !== 'after') throw new Error('Use --phase before|after');

const OUT = join(ROOT, 'docs/screenshots/report-summary-design', phase);
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8794';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4182';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;
const PEARL = '1125 Pearl St, Boulder, CO 80302';
const PATH = `/r/boulder?address=${encodeURIComponent(PEARL)}&radius=10&screenshot=1`;

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

let worker;
let preview;

if (process.env.CAPTURE_ONLY !== '1') {
  run('pnpm --filter @leaseup/contracts build');
  run('pnpm --filter @leaseup/fixtures build');
  run('pnpm --filter @leaseup/worker build');
  run('pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql');
  run('pnpm --filter @leaseup/web build', {
    env: { ...process.env, VITE_API_URL: BASE },
  });
  worker = spawn(
    'pnpm',
    ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', WORKER_PORT, '--local'],
    {
      cwd: ROOT,
      env: { ...process.env, APP_MODE: 'demo', WRANGLER_SEND_ERROR_REPORTS: 'false', CI: 'true' },
      stdio: 'inherit',
    }
  );
  preview = spawn(
    'pnpm',
    ['--filter', '@leaseup/web', 'exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', PREVIEW_PORT, '--strictPort'],
    {
      cwd: ROOT,
      env: { ...process.env, CSP_E2E_WORKER_PORT: WORKER_PORT, CSP_E2E_LOCAL: '1' },
      stdio: 'inherit',
    }
  );
  await waitFor(`${BASE}/api/health`);
  await waitFor(BASE);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    await page.goto(`${BASE}${PATH}`, { waitUntil: 'networkidle' });
    await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
    const summary = page.getByTestId('report-summary');
    const file = join(OUT, `report-summary-${theme}-${width}.png`);
    await summary.screenshot({ path: file });
    console.log('wrote', file);
    await context.close();
  }
}
await browser.close();

if (worker) worker.kill('SIGTERM');
if (preview) preview.kill('SIGTERM');
