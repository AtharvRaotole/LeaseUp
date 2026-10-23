#!/usr/bin/env node
/**
 * Local axe + Lighthouse (mobile) audit against production preview + demo worker.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:4179 node scripts/run-a11y-perf-audit.mjs
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lighthouseBin = require.resolve('lighthouse/cli/index.js');

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4179').replace(/\/$/, '');
const API = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8791').replace(/\/$/, '');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

const MAP_EXCLUDE = '.maplibregl-map, .maplibregl-ctrl-group, .maplibregl-canvas';

async function createPitchUrl() {
  const analyzeRes = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  if (!analyzeRes.ok) throw new Error('analyze failed');
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${API}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  if (!pitchRes.ok) throw new Error('pitch failed');
  const pitch = await pitchRes.json();
  return `${BASE}/pitch/${pitch.id}`;
}

const ROUTES = [
  { name: 'landing', path: '/' },
  {
    name: 'report',
    path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`,
    ready: async (page) => {
      await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
      await page.getByTestId('report-tour-dismiss').click({ timeout: 5000 }).catch(() => undefined);
    },
  },
  { name: 'methodology', path: '/methodology' },
  { name: 'pipeline', path: '/pipeline' },
  { name: 'watchlist', path: '/watchlist' },
  { name: 'not-found', path: '/this-route-does-not-exist' },
];

async function runAxe(page, path, ready) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (ready) await ready(page);
  const results = await new AxeBuilder({ page })
    .exclude(MAP_EXCLUDE)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  return {
    violations: blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
    })),
  };
}

function runLighthouseMobile(url) {
  const out = execFileSync(
    process.execPath,
    [
      lighthouseBin,
      url,
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--only-categories=performance,accessibility,best-practices',
      '--output=json',
      '--quiet',
      '--chrome-flags=--headless --no-sandbox',
    ],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  const lhr = JSON.parse(out);
  const cats = lhr.categories;
  return {
    performance: Math.round((cats.performance?.score ?? 0) * 100),
    accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
  };
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const axe = {};
for (const route of ROUTES) {
  axe[route.name] = await runAxe(page, route.path, route.ready);
}
const pitchUrl = await createPitchUrl();
axe.pitch = await runAxe(page, pitchUrl.replace(BASE, ''), async (p) => {
  await p.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
});

await browser.close();

const reportUrl = `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`;
{
  const warm = await chromium.launch();
  const warmCtx = await warm.newContext();
  const warmPage = await warmCtx.newPage();
  await warmPage.goto(reportUrl, { waitUntil: 'networkidle' });
  await warmPage.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
  await warm.close();
}

const lhScores = {
  landing: await runLighthouseMobile(`${BASE}/`),
  report: await runLighthouseMobile(reportUrl),
};

console.log(JSON.stringify({ axe, lighthouse: lhScores }, null, 2));
