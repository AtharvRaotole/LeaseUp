#!/usr/bin/env node
/** Landing + Wicker report screenshots at 1440 and 390 (light). */
import { execSync, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.env.VQA_OUT || join(ROOT, 'docs/screenshots/junior-royal-redesign/after');
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8794';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4182';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;
const API = `http://127.0.0.1:${WORKER_PORT}`;
const WICKER =
  '/r/wicker?address=1560%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

async function waitFor(url, attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let worker;
let preview;
if (process.env.CAPTURE_ONLY !== '1') {
  execSync('pnpm --filter @leaseup/contracts build', { stdio: 'inherit' });
  execSync('pnpm --filter @leaseup/fixtures build', { stdio: 'inherit' });
  execSync('pnpm --filter @leaseup/worker build', { stdio: 'inherit' });
  execSync('pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql', {
    stdio: 'inherit',
  });
  execSync('pnpm --filter @leaseup/web build', {
    stdio: 'inherit',
    env: { ...process.env, VITE_API_URL: BASE },
  });
  worker = spawn(
    'pnpm',
    ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', WORKER_PORT, '--local'],
    { cwd: ROOT, env: { ...process.env, APP_MODE: 'demo', CI: 'true' }, stdio: 'inherit' }
  );
  preview = spawn(
    'pnpm',
    ['--filter', '@leaseup/web', 'exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', PREVIEW_PORT, '--strictPort'],
    { cwd: ROOT, env: { ...process.env, CSP_E2E_WORKER_PORT: WORKER_PORT, CSP_E2E_LOCAL: '1' }, stdio: 'inherit' }
  );
  await waitFor(`${API}/api/health`);
  await waitFor(`${BASE}/`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const page = await browser.newPage({
    viewport: { width, height: width === 390 ? 844 : 900 },
    colorScheme: 'dark',
  });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('landing-plain-summary').waitFor({ timeout: 60_000 });
  await page.screenshot({ path: join(OUT, `landing-${width}-dark.png`) });
  await page.goto(`${BASE}${WICKER}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await page.getByTestId('report-tour-hint-dismiss').click({ timeout: 2000 }).catch(() => undefined);
  await page.screenshot({ path: join(OUT, `report-wicker-${width}-dark.png`), fullPage: true });
  await page.close();
}
await browser.close();
if (worker) worker.kill('SIGTERM');
if (preview) preview.kill('SIGTERM');
console.log('OK', OUT);
