#!/usr/bin/env node
/** Pitch freshness + non-happy path screenshots (offline preview routes). */
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { viteEnvWithPreviewRoutes } from './preview-routes-vite-env.mjs';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

const PREVIEW_PORT = process.env.PITCH_FRESHNESS_PREVIEW_PORT || '4173';
const BASE = (process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PREVIEW_PORT}`).replace(
  /\/$/,
  ''
);
const OUT = process.env.OUT || '/opt/cursor/artifacts/pitch-freshness';

const CAPTURES = [
  { path: '/pitch/demo-boulder-ulta', wait: 'pitch-freshness-label', tag: 'pitch-freshness' },
  { path: '/__preview/pitch-unavailable', wait: 'pitch-error', tag: 'pitch-unavailable' },
  { path: '/__preview/watchlist-empty', wait: 'watchlist-empty', tag: 'watchlist-empty' },
];

if (process.env.SKIP_BUILD !== '1') {
  run('pnpm --filter @leaseup/contracts build');
  run('pnpm --filter @leaseup/fixtures build');
  run('pnpm --filter @leaseup/web build', {
    env: viteEnvWithPreviewRoutes(BASE),
  });
}

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
  { cwd: process.cwd(), stdio: 'inherit' }
);

async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
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

await waitFor(`${BASE}/`);
await mkdir(OUT, { recursive: true });

async function shot(page, viewport, tag) {
  await page.setViewportSize(viewport);
  for (const cap of CAPTURES) {
    await page.goto(`${BASE}${cap.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId(cap.wait).waitFor({ state: 'visible', timeout: 60_000 });
    const suffix = viewport.width === 390 ? '390' : '1440';
    await page.screenshot({
      path: path.join(OUT, `${cap.tag}-${suffix}.png`),
      fullPage: true,
    });
  }
}

try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await shot(page, { width: 1440, height: 900 });
  await shot(page, { width: 390, height: 844 });
  await browser.close();
  console.log('Saved to', OUT);
} finally {
  preview.kill('SIGTERM');
}
