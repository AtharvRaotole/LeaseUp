#!/usr/bin/env node
import { assertOwnerAuthorizedRecording } from './media-capture-guard.mjs';

assertOwnerAuthorizedRecording();

import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import net from 'node:net';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/worker build');
run('pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql');

const WORKER_PORT = String(process.env.RECORD_DEMO_WORKER_PORT || (await freePort()));
const PREVIEW_PORT = String(process.env.RECORD_DEMO_PREVIEW_PORT || (await freePort()));

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

let preview = null;

async function waitFor(url, attempts = 120) {
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
  run(`PLAYWRIGHT_API_URL=http://127.0.0.1:${WORKER_PORT} node scripts/export-landing-wicker-preview.mjs`);
  run('pnpm --filter @leaseup/web build');

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

  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/`);
  const testFlag = process.env.RECORD_DEMO_TEST === '1' ? 'RECORD_DEMO_TEST=1 ' : '';
  run(
    `${testFlag}RECORD_DEMO_BASE=http://127.0.0.1:${PREVIEW_PORT} RECORD_DEMO_API=http://127.0.0.1:${WORKER_PORT} PLAYWRIGHT_API_URL=http://127.0.0.1:${WORKER_PORT} node scripts/record-demo.mjs`
  );
} finally {
  worker.kill('SIGTERM');
  preview?.kill('SIGTERM');
}
