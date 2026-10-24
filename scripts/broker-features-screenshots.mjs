#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/screenshots/features/broker-features');

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

spawn('pnpm', ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'd1', 'execute', 'leaseup_db', '--local', '--file=schema.sql'], {
  cwd: ROOT,
  stdio: 'inherit',
});

const worker = spawn(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'dev', '--port', String(apiPort), '--local'],
  { cwd: ROOT, env: { ...process.env, APP_MODE: 'demo' }, stdio: 'inherit' }
);

await waitFor(`http://127.0.0.1:${apiPort}/api/health`);

const web = spawn('pnpm', ['--filter', '@leaseup/web', 'exec', 'vite', 'preview', '--port', String(webPort), '--host', '127.0.0.1'], {
  cwd: ROOT,
  env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}` },
  stdio: 'inherit',
});

await waitFor(`http://127.0.0.1:${webPort}/`);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const reportPath = `/r/wicker?address=${encodeURIComponent('1574 N Milwaukee Ave, Chicago, IL 60622')}&radius=10`;

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`http://127.0.0.1:${webPort}${reportPath}`);
  await page.getByTestId('who-shops-here').waitFor({ timeout: 120000 });
  await page.screenshot({ path: join(OUT, `who-shops-here-light-${width}.png`), fullPage: true });
  await page.getByTestId('brands-to-pitch').locator('button').first().click();
  await page.getByTestId('brand-reach-line').waitFor({ timeout: 30000 });
  await page.screenshot({ path: join(OUT, `brand-reach-light-${width}.png`), fullPage: true });
  await page.close();
}

worker.kill();
web.kill();
await browser.close();
console.log('Wrote screenshots to', OUT);
