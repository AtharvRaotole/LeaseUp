#!/usr/bin/env node
/**
 * Lighthouse CI for GitHub Actions: build web, start preview + worker, run lhci.
 */
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

run('pnpm --filter @leaseup/contracts build');
run('pnpm --filter @leaseup/fixtures build');
run('pnpm --filter @leaseup/worker build');
run('pnpm --filter @leaseup/web build', {
  env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'https://ci.leaseup.invalid' },
});

const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', '8787', '--local'],
  {
    cwd: process.cwd(),
    env: { ...process.env, APP_MODE: 'demo' },
    stdio: 'inherit',
  }
);

const preview = spawn('pnpm', ['--filter', '@leaseup/web', 'preview', '--host', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

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
  await waitFor('http://127.0.0.1:8787/api/health');
  await waitFor('http://127.0.0.1:4173/');
  run('npx lhci autorun --config=lighthouserc.cjs');
} finally {
  worker.kill('SIGTERM');
  preview.kill('SIGTERM');
}
