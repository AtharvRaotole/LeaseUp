#!/usr/bin/env node
/**
 * Smoke: wrangler dev + 20 /api/analyze calls on demo addresses (no 503 / CPU 1102).
 */
import { spawn } from 'node:child_process';
import net from 'node:net';

const ROOT = process.cwd();
const ATTEMPTS = Number(process.env.ANALYZE_SMOKE_ATTEMPTS || 20);

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

const ADDRESSES = [
  '1560 N Milwaukee Ave, Chicago, IL 60622',
  '1574 N Milwaukee Ave, Chicago, IL 60622',
  '1300 Pearl St, Boulder, CO 80302',
  '1125 Pearl St, Boulder, CO 80302',
  '125 Collier Dr, Sevierville, TN 37862',
];

const port = await freePort();
const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', String(port), '--local'],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      APP_MODE: 'demo',
      WRANGLER_SEND_ERROR_REPORTS: 'false',
      CI: 'true',
    },
    stdio: 'inherit',
  }
);

let failed = false;
try {
  await waitFor(`http://127.0.0.1:${port}/api/health`);
  for (let i = 0; i < ATTEMPTS; i++) {
    const address = ADDRESSES[i % ADDRESSES.length];
    const res = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, radius: 10 }),
    });
    const text = await res.text();
    const cpuLimit =
      res.status === 503 ||
      /error code:\s*1102/i.test(text) ||
      /CPU time limit/i.test(text);
    if (cpuLimit) {
      console.error(`Analyze failed attempt ${i + 1}: HTTP ${res.status}`, text.slice(0, 200));
      failed = true;
      break;
    }
    if (!res.ok) {
      console.error(`Analyze failed attempt ${i + 1}: HTTP ${res.status}`, text.slice(0, 200));
      failed = true;
      break;
    }
    try {
      JSON.parse(text);
    } catch {
      console.error(`Analyze failed attempt ${i + 1}: non-JSON body`, text.slice(0, 200));
      failed = true;
      break;
    }
  }
  if (!failed) console.log(`Analyze smoke OK (${ATTEMPTS} requests)`);
} finally {
  worker.kill('SIGTERM');
}

process.exit(failed ? 1 : 0);
