#!/usr/bin/env node
/**
 * Print mobile Lighthouse category medians from the last `lhci autorun` (`.lighthouseci/`).
 * Used in CI logs so docs can cite GitHub Actions ubuntu-latest scores.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), '.lighthouseci');
if (!existsSync(DIR)) {
  console.log('LHCI_MEDIANS: missing .lighthouseci (run lhci autorun first)');
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
if (files.length === 0) {
  console.log('LHCI_MEDIANS: no lhr-*.json reports found');
  process.exit(0);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

const byUrl = new Map();
for (const file of files) {
  const report = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const url = report.finalUrl || report.requestedUrl || 'unknown';
  const c = report.categories;
  const row = {
    performance: Math.round((c.performance?.score ?? 0) * 100),
    accessibility: Math.round((c.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((c['best-practices']?.score ?? 0) * 100),
  };
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(row);
}

const summary = {};
for (const [url, runs] of byUrl.entries()) {
  summary[url] = {
    runs: runs.length,
    rawPerformance: runs.map((r) => r.performance),
    median: {
      performance: median(runs.map((r) => r.performance)),
      accessibility: median(runs.map((r) => r.accessibility)),
      bestPractices: median(runs.map((r) => r.bestPractices)),
    },
  };
}

console.log(`LHCI_MEDIANS: ${JSON.stringify(summary)}`);
