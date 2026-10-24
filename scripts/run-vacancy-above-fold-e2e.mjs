#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/worker build');
run(
  'pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql'
);
const WORKER_PORT = process.env.VACANCY_E2E_WORKER_PORT || '8796';
const PREVIEW_PORT = process.env.VACANCY_E2E_PREVIEW_PORT || '4184';
const localPreviewOrigin = `http://127.0.0.1:${PREVIEW_PORT}`;

run('pnpm --filter @leaseup/web build', {
  env: {
    ...process.env,
    VITE_API_URL: process.env.VITE_API_URL || localPreviewOrigin,
  },
});

const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', WORKER_PORT, '--local'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_MODE: 'demo',
      WRANGLER_SEND_ERROR_REPORTS: 'false',
      CI: 'true',
    },
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
    cwd: process.cwd(),
    env: {
      ...process.env,
      CSP_E2E_WORKER_PORT: WORKER_PORT,
      CSP_E2E_LOCAL: '1',
    },
    stdio: 'inherit',
  }
);

async function waitFor(url, attempts = 90) {
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
  await waitFor(`http://127.0.0.1:${WORKER_PORT}/api/health`);
  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/`);
  run(
    `PLAYWRIGHT_BASE_URL=http://127.0.0.1:${PREVIEW_PORT} PLAYWRIGHT_API_URL=http://127.0.0.1:${WORKER_PORT} pnpm exec playwright test e2e/vacancy-above-fold.spec.ts`
  );
} finally {
  worker.kill('SIGTERM');
  preview.kill('SIGTERM');
}
