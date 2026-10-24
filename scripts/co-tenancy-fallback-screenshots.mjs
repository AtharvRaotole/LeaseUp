#!/usr/bin/env node
/**
 * 1440px report screenshots: Boulder and Wicker pitch lists with audience fallback lines.
 * Starts demo worker + web preview unless CAPTURE_ONLY=1.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT =
  process.env.SCREENSHOT_OUT ||
  join(ROOT, 'docs/screenshots/co-tenancy-fallback');
const ARTIFACTS = '/opt/cursor/artifacts/screenshots';
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8796';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4184';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;

const ALL_SITES = [
  {
    id: 'boulder',
    address: '1300 Pearl St, Boulder, CO 80302',
    path: `/r/boulder?address=${encodeURIComponent('1300 Pearl St, Boulder, CO 80302')}&radius=10&screenshot=1`,
  },
  {
    id: 'wicker',
    address: '1574 N Milwaukee Ave, Chicago, IL 60622',
    path: `/r/wicker?address=${encodeURIComponent('1574 N Milwaukee Ave, Chicago, IL 60622')}&radius=10&screenshot=1`,
  },
];

const only = process.env.ONLY_SITES?.split(',').map((s) => s.trim()).filter(Boolean);
const SITES = only?.length
  ? ALL_SITES.filter((site) => only.includes(site.id))
  : ALL_SITES;

let worker;
let preview;

async function waitFor(url, attempts = 120) {
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

async function startStack() {
  if (process.env.CAPTURE_ONLY === '1') return;
  execSync('pnpm --filter @leaseup/contracts build', { stdio: 'inherit', cwd: ROOT });
  execSync('pnpm --filter @leaseup/fixtures build', { stdio: 'inherit', cwd: ROOT });
  execSync('pnpm --filter @leaseup/worker build', { stdio: 'inherit', cwd: ROOT });
  execSync(
    'pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql',
    { stdio: 'inherit', cwd: ROOT }
  );
  execSync('pnpm --filter @leaseup/web build', {
    stdio: 'inherit',
    cwd: ROOT,
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
    { cwd: ROOT, stdio: 'inherit' }
  );
  await waitFor(`${BASE}/`);
  await waitFor(`http://127.0.0.1:${WORKER_PORT}/api/health`);
}

function shutdown() {
  worker?.kill('SIGTERM');
  preview?.kill('SIGTERM');
}

await mkdir(OUT, { recursive: true });
await mkdir(ARTIFACTS, { recursive: true });
await startStack();

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  colorScheme: 'light',
});
const page = await context.newPage();

for (const site of SITES) {
  await page.goto(`${BASE}${site.path}`, { waitUntil: 'networkidle', timeout: 180_000 });
  await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180_000 });
  await page.getByTestId('report-top-brands-list').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  const file = `pitch-fallback-${site.id}-1440.png`;
  const docPath = join(OUT, file);
  const artifactPath = join(ARTIFACTS, file);
  await page.locator('[data-testid="brands-to-pitch"]').screenshot({ path: docPath });
  await page.locator('[data-testid="brands-to-pitch"]').screenshot({ path: artifactPath });
  console.log('saved', docPath, artifactPath);
}

await browser.close();
shutdown();
process.exit(0);
