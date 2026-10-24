#!/usr/bin/env node
/**
 * Screenshots for broker comprehension pass (local demo preview + worker).
 * Usage: node scripts/broker-comprehension-screenshots.mjs --phase before|after
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

import { execSync } from 'node:child_process';

const ROOT = process.cwd();
execSync('pnpm --filter @leaseup/contracts build', { cwd: ROOT, stdio: 'inherit' });
execSync('pnpm --filter @leaseup/fixtures build', { cwd: ROOT, stdio: 'inherit' });
execSync('pnpm --filter @leaseup/worker build', { cwd: ROOT, stdio: 'inherit' });
const phase = process.argv.includes('--phase')
  ? process.argv[process.argv.indexOf('--phase') + 1]
  : 'after';
if (phase !== 'before' && phase !== 'after') {
  throw new Error('Pass --phase before or --phase after');
}
const OUT = join(ROOT, 'docs/screenshots/broker-comprehension', phase);

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

async function waitFor(url) {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout ${url}`);
}

const apiPort = await freePort();
const webPort = await freePort();
const base = `http://127.0.0.1:${webPort}`;
const api = `http://127.0.0.1:${apiPort}`;

spawn('pnpm', ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'd1', 'execute', 'leaseup_db', '--local', '--file=schema.sql'], {
  cwd: ROOT,
  stdio: 'inherit',
});

const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', String(apiPort), '--local'],
  { cwd: ROOT, env: { ...process.env, APP_MODE: 'demo' }, stdio: 'inherit' }
);

await waitFor(`${api}/api/health`);

execSync(`VITE_API_URL=${base} pnpm --filter @leaseup/web build`, { cwd: ROOT, stdio: 'inherit' });

const web = spawn(
  'pnpm',
  ['--filter', '@leaseup/web', 'exec', 'vite', 'preview', '--port', String(webPort), '--host', '127.0.0.1', '--strictPort'],
  {
    cwd: ROOT,
    env: { ...process.env, VITE_API_URL: base, CSP_E2E_LOCAL: '1', CSP_E2E_WORKER_PORT: String(apiPort) },
    stdio: 'inherit',
  }
);

await waitFor(`${base}/`);

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const analyzeRes = await fetch(`${api}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: WICKER, radius: 10 }),
});
if (!analyzeRes.ok) throw new Error('analyze failed');
const analysis = await analyzeRes.json();
const pitchRes = await fetch(`${api}/api/pitch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ results: analysis, radiusKm: 10 }),
});
if (!pitchRes.ok) throw new Error('pitch failed');
const pitch = await pitchRes.json();

const routes = [
  { name: 'report', path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`, ready: async (page) => {
    await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
    await page.getByTestId('report-tour-dismiss').click({ timeout: 5000 }).catch(() => undefined);
  }},
  { name: 'methodology', path: '/methodology' },
  { name: 'pipeline', path: '/pipeline' },
  { name: 'watchlist', path: '/watchlist' },
  { name: 'pitch', path: `/pitch/${pitch.id}`, ready: async (page) => {
    await page.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
  }},
  { name: 'brand', path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago', ready: async (page) => {
    await page.getByRole('heading', { name: /sites for/i }).waitFor({ timeout: 60_000 }).catch(() => undefined);
  }},
  { name: 'portfolio', path: '/portfolio' },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [390, 1440]) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width, height: Math.min(1200, width === 390 ? 844 : 900) } });
    await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
    if (route.ready) await route.ready(page);
    await page.screenshot({
      path: join(OUT, `${route.name}-${width}.png`),
      fullPage: true,
    });
    await page.close();
  }
}

await browser.close();
worker.kill('SIGTERM');
web.kill('SIGTERM');
console.log('Wrote', OUT);
