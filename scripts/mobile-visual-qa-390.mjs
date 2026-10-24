#!/usr/bin/env node
/**
 * Mobile visual QA at 390px, light + dark. Requires demo stack:
 *   VQA_PREVIEW_PORT=4182 VQA_WORKER_PORT=8794 node scripts/mobile-visual-qa-390.mjs
 * Or CAPTURE_ONLY=1 when preview + worker already running with VITE_API_URL = preview origin.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.env.VQA_OUT || join(ROOT, 'docs/screenshots/mobile-visual-qa-390/after');
const WORKER_PORT = process.env.VQA_WORKER_PORT || '8794';
const PREVIEW_PORT = process.env.VQA_PREVIEW_PORT || '4182';
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;
const API = `http://127.0.0.1:${WORKER_PORT}`;
const WIDTH = 390;
const HEIGHT = 844;
const TOUR_KEY = 'leaseup-report-guided-tour-v1';
const DASH_RE = /[\u2013\u2014]/;
const WICKER_PITCH = '1574 N Milwaukee Ave, Chicago, IL 60622';

const DEMO_REPORTS = [
  {
    id: 'report-wicker',
    path: '/r/wicker?address=1560%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1',
    wait: 'report-summary',
  },
  {
    id: 'report-boulder',
    path: '/r/boulder?address=1300%20Pearl%20St%2C%20Boulder%2C%20CO%2080302&radius=10&screenshot=1',
    wait: 'report-summary',
  },
  {
    id: 'report-sevierville',
    path: '/r/sevierville?address=125%20Collier%20Dr%2C%20Sevierville%2C%20TN%2037862&radius=10&screenshot=1',
    wait: 'report-summary',
  },
  {
    id: 'report-bleecker',
    path: `/r/bleecker?address=${encodeURIComponent('350 Bleecker St, New York, NY 10014')}&radius=10&screenshot=1&lat=40.73352&lng=-74.00271&pinConfirmed=1&neighborhood=${encodeURIComponent('West Village')}&city=${encodeURIComponent('New York')}&resolved=${encodeURIComponent('350 Bleecker Street, West Village, Manhattan, New York, NY 10014, United States')}`,
    waitReportOrDemoError: true,
    optional: true,
  },
];

const PAGES = [
  { id: 'landing', path: '/', wait: 'landing-plain-summary', extra: 'landing' },
  ...DEMO_REPORTS.map((d) => ({ ...d, extra: 'report' })),
  { id: 'brand', path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago', wait: 'brand-opportunities' },
  { id: 'portfolio', path: '/portfolio', wait: 'portfolio-input' },
  { id: 'pipeline', path: '/pipeline', wait: 'pipeline-page', prepare: 'pipeline' },
  { id: 'methodology', path: '/methodology', waitHeading: 'How LeaseUp ranks tenants' },
  { id: 'watchlist', path: '/watchlist', wait: 'watchlist-page' },
  { id: 'pitch-boulder', path: '/pitch/demo-boulder-ulta', wait: 'pitch-page' },
  { id: 'pitch-wicker', prepare: 'pitch-wicker', wait: 'pitch-page' },
];

const issues = [];
const SKIP_ASSERT = process.env.VQA_SKIP_ASSERT === '1';

function record(id, message) {
  if (SKIP_ASSERT) return;
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
  run('pnpm --filter @leaseup/worker exec wrangler d1 execute leaseup_db --local --file=schema.sql');
  run('pnpm --filter @leaseup/web build', { env: { ...process.env, VITE_API_URL: BASE } });
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
    ['--filter', '@leaseup/web', 'exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', PREVIEW_PORT, '--strictPort'],
    { cwd: ROOT, env: { ...process.env, CSP_E2E_WORKER_PORT: WORKER_PORT, CSP_E2E_LOCAL: '1' }, stdio: 'inherit' }
  );
  await waitFor(`${API}/api/health`);
  await waitFor(`${BASE}/`);
}

function boxesIntersect(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function preparePipeline(page) {
  await page.goto(
    `${BASE}/r/boulder?address=${encodeURIComponent('1300 Pearl St, Boulder, CO 80302')}&radius=10&screenshot=1`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await dismissTour(page);
  const addBtn = page.getByTestId('report-primary-actions').getByTestId('add-to-pipeline');
  await addBtn.waitFor({ timeout: 30_000 });
  await addBtn.click();
  await page.getByRole('button', { name: 'Added to pipeline' }).waitFor({ timeout: 30_000 });
  await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' });
}

async function preparePitchWicker(page) {
  const analyzeRes = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER_PITCH, radius: 10 }),
  });
  if (!analyzeRes.ok) throw new Error(`analyze failed: ${analyzeRes.status}`);
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${API}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  if (!pitchRes.ok) throw new Error(`pitch failed: ${pitchRes.status}`);
  const pitch = await pitchRes.json();
  await page.goto(`${BASE}/pitch/${pitch.id}`, { waitUntil: 'domcontentloaded' });
}

async function waitReportReady(page, def) {
  if (def.waitReportOrDemoError) {
    await Promise.race([
      page.getByTestId('report-summary').waitFor({ timeout: 90_000 }),
      page.getByTestId('report-error').waitFor({ timeout: 90_000 }),
    ]);
    return;
  }
  if (def.wait) await page.getByTestId(def.wait).waitFor({ timeout: 120_000 });
  else if (def.waitHeading) {
    await page.getByRole('heading', { name: def.waitHeading }).waitFor({ timeout: 30_000 });
  }
}

async function dismissTour(page) {
  await page.getByTestId('report-tour-hint-dismiss').click({ timeout: 2000 }).catch(() => undefined);
  await page.getByTestId('report-tour-dismiss').click({ timeout: 2000 }).catch(() => undefined);
}

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(() => {
    const slack = 2;
    const bad = [];
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
  if (offenders.length > 0) record(label, `horizontal overflow: ${offenders.join(', ')}`);
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
}

async function assertReportTourLayout(page, label) {
  const hint = page.getByTestId('report-first-run-tour-hint');
  if (!(await hint.isVisible().catch(() => false))) return;
  const layout = await hint.evaluate((el) => {
    const hintRect = el.getBoundingClientRect();
    const brands = document.querySelector('[data-testid="brands-to-pitch"]');
    const headline = document.querySelector('[data-testid="report-summary"] h2');
    const brandsTop = brands?.getBoundingClientRect().top ?? 0;
    const headlineTop = headline?.getBoundingClientRect().top ?? 0;
    return { hintTop: hintRect.top, headlineTop, brandsTop, hintBottom: hintRect.bottom };
  });
  if (layout.hintTop < layout.headlineTop - 2) {
    record(label, 'tour hint renders above report headline');
  }
  if (layout.hintBottom > layout.brandsTop + 4) {
    record(label, 'tour hint extends below brands-to-pitch');
  }
}

async function assertMapLegend(page, label) {
  const legend = page.getByTestId('report-map-legend');
  if (!(await legend.count())) return;
  const box = await legend.boundingBox();
  if (!box) return;
  if (box.width > WIDTH + 2) {
    record(label, `map legend width ${box.width}px exceeds viewport`);
  }
}

async function runExtra(page, kind, label) {
  if (kind === 'landing') await assertLandingLayout(page, label);
  if (kind === 'report') {
    await assertReportTourLayout(page, label);
    await assertMapLegend(page, label);
  }
}

const ONLY = process.env.VQA_ONLY?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await mkdir(OUT, { recursive: true });
await startStack();

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const def of PAGES) {
    if (ONLY?.length && !ONLY.includes(def.id)) continue;
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      colorScheme: theme,
    });
    await context.addInitScript(
      ({ key, colorScheme }) => {
        if (colorScheme === 'light') localStorage.removeItem(key);
      },
      { key: TOUR_KEY, colorScheme: theme }
    );
    const page = await context.newPage();
    const label = `${def.id}-${theme}-${WIDTH}`;
    try {
      if (def.prepare === 'pipeline') await preparePipeline(page);
      else if (def.prepare === 'pitch-wicker') await preparePitchWicker(page);
      else {
        await page.goto(`${BASE}${def.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      }
      await waitReportReady(page, def);
      if (def.id.startsWith('report-') && !def.waitReportOrDemoError) {
        await page.evaluate((key) => localStorage.removeItem(key), TOUR_KEY);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitReportReady(page, def);
      }
      const body = await page.locator('body').innerText();
      if (DASH_RE.test(body)) record(label, 'page body contains em/en dash');
      if (def.extra) await runExtra(page, def.extra, label);
      await assertNoOverflow(page, label);
      const file = join(OUT, `${def.id}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('wrote', file);
    } catch (err) {
      if (def.optional) console.warn('skip optional', label, err.message);
      else record(label, err.message);
    }
    await context.close();
  }
}

await browser.close();
await writeFile(join(OUT, 'issues.json'), JSON.stringify(issues, null, 2));
if (worker) worker.kill('SIGTERM');
if (preview) preview.kill('SIGTERM');
if (issues.length > 0) {
  console.error(`${issues.length} issue(s)`);
  process.exit(1);
}
console.log('OK', OUT);
