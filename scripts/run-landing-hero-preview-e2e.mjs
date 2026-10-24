#!/usr/bin/env node
/**
 * Playwright smoke: landing hero preview image must decode (naturalWidth > 0).
 */
import { spawn, execSync } from 'node:child_process';
import { viteEnvWithPreviewRoutes } from './preview-routes-vite-env.mjs';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

const PREVIEW_PORT = process.env.LANDING_HERO_E2E_PORT || '4173';
const previewOrigin = `http://127.0.0.1:${PREVIEW_PORT}`;

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/web build', {
  env: viteEnvWithPreviewRoutes(process.env.VITE_API_URL || previewOrigin),
});

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
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  await waitFor(`${previewOrigin}/`);
  run('pnpm exec playwright test e2e/landing-hero-preview.spec.ts', {
    env: { ...process.env, PLAYWRIGHT_BASE_URL: previewOrigin },
  });
} finally {
  preview.kill('SIGTERM');
}
