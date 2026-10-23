#!/usr/bin/env node
/**
 * Run Lighthouse against preview + worker. Writes JSON summary to path in LIGHTHOUSE_OUT.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.LIGHTHOUSE_BASE || 'http://localhost:4173';
const OUT = process.env.LIGHTHOUSE_OUT || join(process.cwd(), 'docs/lighthouse-scores.json');
const REPORT_URL =
  `${BASE}/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1`;

const urls = [
  { id: 'home', url: `${BASE}/` },
  { id: 'report', url: REPORT_URL },
];

mkdirSync(join(process.cwd(), 'docs'), { recursive: true });

const results = { capturedAt: new Date().toISOString(), base: BASE, pages: {} };

for (const { id, url } of urls) {
  const outDir = join(process.cwd(), '.lighthouse', id);
  mkdirSync(outDir, { recursive: true });
  const cmd = `pnpm exec lighthouse "${url}" --quiet --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=${join(outDir, 'report.json')}`;
  execSync(cmd, { stdio: 'inherit' });
  const json = JSON.parse(
    execSync(`cat ${join(outDir, 'report.json')}`, { encoding: 'utf8' })
  );
  results.pages[id] = {
    url,
    scores: {
      performance: json.categories.performance.score,
      accessibility: json.categories.accessibility.score,
      bestPractices: json.categories['best-practices'].score,
      seo: json.categories.seo.score,
    },
  };
}

writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log('Wrote', OUT, JSON.stringify(results.pages, null, 2));
