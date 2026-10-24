#!/usr/bin/env node
/**
 * Full offline visual QA: 390/1440 × light/dark screenshots + layout/copy assertions.
 * Prereq when CAPTURE_ONLY=1: demo worker + preview (VITE_API_URL = preview origin).
 * Otherwise builds and starts local demo stack (no deployed URLs).
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { viteEnvWithPreviewRoutes } from './preview-routes-vite-env.mjs';

const ROOT = process.cwd();
const OUT = process.env.VQA_OUT || join(ROOT, 'docs/screenshots/visual-qa-pass/before');
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8794';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4182';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;
const API = `http://127.0.0.1:${WORKER_PORT}`;
const PEARL = '1125 Pearl St, Boulder, CO 80302';
const BLEECKER = '350 Bleecker St, New York, NY 10014';
const DASH_RE = /[\u2013\u2014]/;
const issues = [];

function record(id, message) {
  issues.push({ id, message });
  console.error(`ISSUE [${id}]: ${message}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

async function waitFor(url, attempts = 90) {
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

let worker;
let preview;

async function startStack() {
  if (process.env.CAPTURE_ONLY === '1') return;
  run('pnpm --filter @leaseup/contracts build');
  run('pnpm --filter @leaseup/fixtures build');
  run('pnpm --filter @leaseup/worker build');
  run(
    'pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql'
  );
  run('pnpm --filter @leaseup/web build', {
    env: viteEnvWithPreviewRoutes(BASE),
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
    {
      cwd: ROOT,
      env: { ...process.env, CSP_E2E_WORKER_PORT: WORKER_PORT, CSP_E2E_LOCAL: '1' },
      stdio: 'inherit',
    }
  );
  await waitFor(`${API}/api/health`);
  await waitFor(`${BASE}/`);
}

function boxesIntersect(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function assertLandingLayout(page, label) {
  const input = page.getByTestId('landing-address-input');
  if (!(await input.count())) return;
  const analyze = page.getByTestId('landing-analyze-button');
  const inputBox = await input.boundingBox();
  const analyzeBox = await analyze.boundingBox();
  if (inputBox && inputBox.width < 200) {
    record(label, `landing input width ${inputBox.width}px < 200`);
  }
  if (inputBox && analyzeBox && analyzeBox.top < inputBox.bottom - 4 && boxesIntersect(inputBox, analyzeBox)) {
    record(label, 'landing Analyze overlaps address input');
  }
  const light = page.getByTestId('landing-hero-preview-img-light');
  const dark = page.getByTestId('landing-hero-preview-img-dark');
  const hero = (await light.isVisible()) ? light : dark;
  if (await hero.count()) {
    const nw = await hero.evaluate((el) => (el instanceof HTMLImageElement ? el.naturalWidth : 0));
    if (nw <= 0) record(label, 'landing hero naturalWidth is 0');
  }
}

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(() => {
    const bad = [];
    const slack = 2;
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + slack) {
      bad.push(`document (+${doc.scrollWidth - window.innerWidth}px)`);
    }
    const main = document.querySelector('main');
    if (main instanceof HTMLElement && main.scrollWidth > main.clientWidth + slack) {
      bad.push(`main (+${main.scrollWidth - main.clientWidth}px)`);
    }
    return bad;
  });
  if (offenders.length > 0) {
    record(label, `horizontal overflow: ${offenders.join(', ')}`);
  }
}

async function assertTopBrandReasons(page, label) {
  const list = page.getByTestId('report-top-brands-list');
  if (!(await list.count())) return;
  const reasons = await list.locator('li button .text-body').allInnerTexts();
  const top3 = reasons.slice(0, 3).map((t) => t.trim()).filter(Boolean);
  if (top3.length >= 2 && new Set(top3).size < top3.length) {
    record(label, `duplicate top-3 one-liners: ${JSON.stringify(top3)}`);
  }
  for (const line of top3) {
    if (DASH_RE.test(line)) record(label, `en/em dash in brand line: ${line}`);
  }
}

async function dismissChrome(page) {
  await page.getByRole('button', { name: /dismiss/i }).click({ timeout: 2000 }).catch(() => undefined);
  await page.getByTestId('report-tour-dismiss').click({ timeout: 2000 }).catch(() => undefined);
}

async function preparePipeline(page) {
  await page.goto(
    `${BASE}/r/boulder?address=${encodeURIComponent(PEARL)}&radius=10&screenshot=1`,
    { waitUntil: 'networkidle' }
  );
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await dismissChrome(page);
  const addBtn = page.getByTestId('report-primary-actions').getByTestId('add-to-pipeline');
  await addBtn.waitFor({ timeout: 30_000 });
  await addBtn.click();
  await page.getByRole('button', { name: 'Added to pipeline' }).waitFor({ timeout: 30_000 });
  await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
}

async function prepareWatchlist(page) {
  await page.goto(`${BASE}/__preview/watchlist-diff`);
  await page.getByTestId('watchlist-diff-preview').waitFor({ timeout: 30_000 });
}

const PAGE_DEFS_BASE = [
  {
    id: 'landing',
    path: '/',
    waitTestId: 'landing-plain-summary',
    extra: assertLandingLayout,
  },
  {
    id: 'report-pearl',
    path: `/r/boulder?address=${encodeURIComponent(PEARL)}&radius=10&screenshot=1`,
    waitTestId: 'report-summary',
    extra: assertTopBrandReasons,
  },
  {
    id: 'report-bleecker',
    path: `/r/bleecker?address=${encodeURIComponent(BLEECKER)}&radius=10&screenshot=1`,
    waitTestId: null,
    timeout: 30_000,
    optional: true,
  },
  { id: 'brand', path: '/brand', waitTestId: 'brand-search' },
  {
    id: 'brand-detail',
    path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago',
    waitTestId: 'brand-opportunities',
  },
  { id: 'portfolio', path: '/portfolio', waitTestId: 'portfolio-input' },
  { id: 'pipeline', path: '/pipeline', waitTestId: 'pipeline-page', prepare: preparePipeline },
  {
    id: 'pipeline-empty',
    path: '/pipeline',
    waitTestId: 'pipeline-empty',
    prepare: async (page) => {
      await page.context().clearCookies();
      await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
    },
    optional: true,
  },
  { id: 'watchlist', path: '/__preview/watchlist-diff', waitTestId: 'watchlist-diff-preview', prepare: prepareWatchlist },
  {
    id: 'methodology',
    path: '/methodology',
    waitTestId: null,
    waitHeading: 'How LeaseUp ranks tenants',
  },
  { id: 'not-found', path: '/this-route-does-not-exist', waitTestId: 'not-found-page' },
];

await mkdir(OUT, { recursive: true });
await startStack();

const pitchPath = '/pitch/demo-boulder-ulta';

const PAGE_DEFS = [
  ...PAGE_DEFS_BASE.slice(0, 6),
  { id: 'pitch', path: pitchPath, waitTestId: 'pitch-page', optional: pitchPath.includes('unavailable') },
  ...PAGE_DEFS_BASE.slice(6),
];

const ONLY = process.env.VQA_ONLY?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    for (const def of PAGE_DEFS) {
      if (ONLY?.length && !ONLY.includes(def.id)) continue;
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
      });
      await context.addInitScript(
        ({ key, value }) => {
          localStorage.setItem(key, value);
          document.documentElement.dataset.theme = value;
          document.documentElement.style.colorScheme = value;
        },
        { key: 'leaseup-theme', value: theme }
      );
      const page = await context.newPage();
      const label = `${def.id}-${theme}-${width}`;
      try {
        if (def.prepare) await def.prepare(page);
        else await page.goto(`${BASE}${def.path}`, { waitUntil: 'networkidle' });
        if (def.waitTestId) {
          await page.getByTestId(def.waitTestId).waitFor({ timeout: def.timeout ?? 120_000 });
        } else if (def.waitHeading) {
          await page.getByRole('heading', { name: def.waitHeading }).waitFor({ timeout: 30_000 });
        }
        await dismissChrome(page);
        const body = await page.locator('body').innerText();
        if (DASH_RE.test(body)) record(label, 'page body contains em/en dash');
        if (/\bleaseup\.app\b/i.test(body)) record(label, 'page contains leaseup.app');
        if (def.extra) await def.extra(page, label);
        await assertNoOverflow(page, label);
        const file = join(OUT, `${def.id}-${theme}-${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('wrote', file);
      } catch (err) {
        if (def.optional) {
          console.warn('skip optional', label, err.message);
        } else {
          record(label, err.message);
        }
      }
      await context.close();
    }
  }
}

await browser.close();
await writeFile(join(OUT, 'issues.json'), JSON.stringify(issues, null, 2));

if (worker) worker.kill('SIGTERM');
if (preview) preview.kill('SIGTERM');

if (issues.length > 0) {
  console.error(`\n${issues.length} issue(s). See ${OUT}/issues.json`);
  process.exit(1);
}
console.log('Visual QA pass OK. Screenshots in', OUT);
