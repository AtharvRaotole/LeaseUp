#!/usr/bin/env node
/** Agent receipt screenshots (offline preview route). */
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { viteEnvWithPreviewRoutes } from './preview-routes-vite-env.mjs';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

const PREVIEW_PORT = process.env.AGENT_RECEIPT_PREVIEW_PORT || '4173';
const BASE = (process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PREVIEW_PORT}`).replace(
  /\/$/,
  ''
);
const OUT = process.env.OUT || '/opt/cursor/artifacts/agent-receipt';
const ROUTE = '/__preview/prospecting-receipt';

if (process.env.SKIP_BUILD !== '1') {
  run('pnpm --filter @leaseup/contracts build');
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

try {
  await waitFor(`${BASE}/`);
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
} finally {
  preview.kill('SIGTERM');
}
