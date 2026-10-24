#!/usr/bin/env node
/**
 * Mobile Lighthouse on Wicker report: one cold discard + N post-warm runs.
 * Usage: PLAYWRIGHT_BASE_URL=... PLAYWRIGHT_API_URL=... node scripts/measure-report-lighthouse.mjs
 * Env: REPORT_LH_RUNS (default 5)
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lighthouseBin = require.resolve('lighthouse/cli/index.js');

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4183').replace(/\/$/, '');
const API = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8795').replace(/\/$/, '');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const RUNS = Number(process.env.REPORT_LH_RUNS || '5');

async function warmWorker() {
  const res = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  if (!res.ok) throw new Error('worker warmup analyze failed');
}

function runLighthouseMobile(url) {
  const out = execFileSync(
    process.execPath,
    [
      lighthouseBin,
      url,
      '--quiet',
      '--chrome-flags=--headless --no-sandbox',
      '--only-categories=performance,accessibility,best-practices',
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--screenEmulation.width=390',
      '--screenEmulation.height=844',
      '--screenEmulation.deviceScaleFactor=2',
      '--output=json',
    ],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  const report = JSON.parse(out);
  const c = report.categories;
  return {
    performance: Math.round((c.performance?.score ?? 0) * 100),
    accessibility: Math.round((c.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((c['best-practices']?.score ?? 0) * 100),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

await warmWorker();

const reportUrl = `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`;
runLighthouseMobile(reportUrl); // discard cold

const raw = [];
for (let i = 0; i < RUNS; i++) {
  raw.push(runLighthouseMobile(reportUrl));
  if (i < RUNS - 1) {
    await new Promise((r) => setTimeout(r, 3000));
  }
}

const performanceScores = raw.map((r) => r.performance);
const result = {
  commit: process.env.GIT_COMMIT || 'unknown',
  reportUrl,
  runs: RUNS,
  rawPerformance: performanceScores,
  raw,
  median: {
    performance: median(performanceScores),
    accessibility: median(raw.map((r) => r.accessibility)),
    bestPractices: median(raw.map((r) => r.bestPractices)),
  },
};

console.log(JSON.stringify(result, null, 2));
