#!/usr/bin/env node
/**
 * Address robustness sweep: POST /api/geocode + /api/analyze for scripted addresses.
 *
 * Default target is local wrangler (`http://127.0.0.1:8787`). Production requires opt-in:
 *   ALLOW_LIVE_WORKER_QA=1 WORKER_BASE=https://leaseup-worker.issue-atharva.workers.dev ...
 *
 * Offline recap from a saved report (no network):
 *   node scripts/qa/address-sweep.mjs --recap docs/qa/address-sweep.md
 *
 * Usage:
 *   pnpm qa:address-sweep
 *   node scripts/qa/address-sweep.mjs --write docs/qa/address-sweep.md
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePayload, criticalIssues, rowPass } from './address-sweep-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ADDRESSES_PATH = join(ROOT, 'scripts/qa/addresses-sweep.json');
const PRODUCTION_WORKER_HOST = 'leaseup-worker.issue-atharva.workers.dev';
const DEFAULT_LOCAL_WORKER = 'http://127.0.0.1:8787';
const WORKER_BASE = (process.env.WORKER_BASE || DEFAULT_LOCAL_WORKER).replace(/\/$/, '');
const DELAY_MS = Number(process.env.DELAY_MS || 3500);
const RADIUS = Number(process.env.SWEEP_RADIUS || 10);

const writePath = process.argv.includes('--write')
  ? process.argv[process.argv.indexOf('--write') + 1]
  : null;
const recapPath = process.argv.includes('--recap')
  ? process.argv[process.argv.indexOf('--recap') + 1]
  : null;

function assertSafeWorkerTarget() {
  if (!WORKER_BASE.includes(PRODUCTION_WORKER_HOST)) return;
  if (process.env.ALLOW_LIVE_WORKER_QA === '1') return;
  console.error(
    `Refusing production worker ${PRODUCTION_WORKER_HOST} without ALLOW_LIVE_WORKER_QA=1 (KV writes on /api/analyze).`
  );
  process.exit(2);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodePreview(address) {
  const start = Date.now();
  const res = await fetch(`${WORKER_BASE}/api/geocode`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const firstCandidate = json?.candidates?.[0] ?? null;
  const confirmedLocation = res.ok
    ? json?.location ??
      (firstCandidate
        ? {
            address,
            latitude: firstCandidate.latitude,
            longitude: firstCandidate.longitude,
            city: firstCandidate.city,
            neighborhood: firstCandidate.neighborhood,
            resolvedAddress: firstCandidate.resolvedAddress ?? firstCandidate.neighborhood,
          }
        : null)
    : null;
  return {
    status: res.status,
    latencyMs,
    needsConfirmation: json?.needsConfirmation ?? null,
    candidateCount: json?.candidates?.length ?? null,
    resolvedLabel: json?.location?.resolvedAddress ?? json?.location?.neighborhood ?? null,
    code: json?.code ?? null,
    error: json?.error ?? null,
    confirmedLocation,
  };
}

async function analyze(address, confirmedLocation) {
  const start = Date.now();
  const payload = { address, radius: RADIUS };
  if (confirmedLocation) payload.confirmedLocation = confirmedLocation;
  const res = await fetch(`${WORKER_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const issues = res.ok && json ? analyzePayload(json, RADIUS) : [];
  if (!res.ok) issues.push(`http_${res.status}`);
  if (json?.code) issues.push(String(json.code));
  return {
    status: res.status,
    latencyMs,
    code: json?.code ?? null,
    error: json?.error ?? null,
    brandCount: json?.prospects?.length ?? null,
    insightPool: json?.rankings?.length ?? json?.dataQuality ? null : null,
    rankingCount: json?.rankings?.length ?? null,
    resolvedLabel:
      json?.location?.resolvedAddress ??
      json?.location?.neighborhood ??
      json?.candidates?.[0]?.resolvedAddress ??
      null,
    candidates: json?.candidates?.length ?? null,
    issues,
    mode: json?.mode ?? null,
  };
}

function mdEscape(s) {
  return String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

async function recapFromReport(path) {
  const md = await readFile(join(ROOT, path), 'utf8');
  const m = md.match(/## Raw JSON\s+```json\s+([\s\S]*?)\n```/);
  if (!m) throw new Error('No Raw JSON block in report');
  const { summary, results } = JSON.parse(m[1]);
  let pass = 0;
  for (const r of results) {
    if (rowPass(r.geocode, r.analyze)) pass += 1;
  }
  const passRate = ((pass / results.length) * 100).toFixed(1);
  console.log(
    JSON.stringify({
      mode: 'recap',
      source: path,
      originalAt: summary.at,
      worker: summary.worker,
      pass,
      total: results.length,
      passRatePct: passRate,
    })
  );
}

async function main() {
  if (recapPath) {
    await recapFromReport(recapPath);
    return;
  }

  assertSafeWorkerTarget();

  const rows = JSON.parse(await readFile(ADDRESSES_PATH, 'utf8'));
  const results = [];
  let pass = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i > 0) await sleep(DELAY_MS);

    const geo = await geocodePreview(row.input);
    await sleep(500);
    const confirmed = geo.confirmedLocation ?? undefined;
    const analysis = await analyze(row.input, confirmed);

    const ok = rowPass(geo, analysis);
    if (ok) pass += 1;

    results.push({
      id: row.id,
      input: row.input,
      notes: row.notes,
      geocode: geo,
      analyze: analysis,
      pass: ok,
    });
    console.log(
      JSON.stringify({
        id: row.id,
        analyzeStatus: analysis.status,
        pass: ok,
        issues: analysis.issues,
        brands: analysis.brandCount,
        geoPicker: geo.needsConfirmation,
      })
    );
  }

  const passRate = ((pass / results.length) * 100).toFixed(1);
  const summary = {
    worker: WORKER_BASE,
    at: new Date().toISOString(),
    total: results.length,
    pass,
    passRatePct: passRate,
  };

  const issueCounts = {};
  for (const r of results) {
    for (const i of r.analyze.issues) {
      issueCounts[i] = (issueCounts[i] || 0) + 1;
    }
    if (r.geocode.code) issueCounts[`geocode:${r.geocode.code}`] = (issueCounts[`geocode:${r.geocode.code}`] || 0) + 1;
    if (r.geocode.status >= 500) issueCounts.geocode_internal = (issueCounts.geocode_internal || 0) + 1;
  }
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]) => `- ${k}: ${n}`)
    .join('\n');

  if (writePath) {
    const lines = [
      '# Live address robustness sweep',
      '',
      `Worker: ${WORKER_BASE}`,
      `Run at: ${summary.at}`,
      `Delay between analyze calls: ${DELAY_MS}ms`,
      `Pass rate: **${pass}/${results.length} (${passRate}%)** (analyze HTTP 200 with no critical flags, or paired GEOCODE_NOT_FOUND on geocode + analyze)`,
      '',
      '## Top issues (this run)',
      '',
      topIssues || '- none',
      '',
      '### Findings for other agents',
      '',
      '- **bc-2041c19b**: picker shown on many close-score pairs; watch duplicate candidates in same ZIP.',
      '- **bc-8baf732b**: `suspicious_category_world_market` on several dense urban runs; verify dual-source rules for home/gift retailers.',
      '',
      '### Worker fixes in this PR (re-run after deploy)',
      '',
      '- Suite and address-range normalization before Nominatim structured search (Houston Galleria, Alberta range).',
      '- `GEOCODE_NOT_FOUND` (404) instead of `INTERNAL_ERROR` (500) when Nominatim returns no candidates (PO Box, bad typos).',
      '- Qloo `503` bursts during sweep: mitigated on integration branch via `fetchQlooWithRetry` (#36); live worker may still 503 under load until that deploy.',
      '',
      '## Delegated to other agents',
      '',
      '- Geocode picker dedupe and ZIP filtering: **bc-2041c19b**',
      '- REI / Verified absent dual-source logic: **bc-8baf732b**',
      '',
      '| ID | Input | Geo HTTP | Geo picker | Analyze | Latency (ms) | Brands | Resolved label | Issues | Notes |',
      '| --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- |',
    ];
    for (const r of results) {
      lines.push(
        `| ${r.id} | ${mdEscape(r.input)} | ${r.geocode.status} | ${r.geocode.needsConfirmation} (${r.geocode.candidateCount ?? 'n/a'} cand.) | ${r.analyze.status} | ${r.analyze.latencyMs} | ${r.analyze.brandCount ?? 'n/a'} | ${mdEscape(r.analyze.resolvedLabel ?? r.geocode.resolvedLabel)} | ${mdEscape(r.analyze.issues.join(', ') || 'none')} | ${mdEscape(r.notes)} |`
      );
    }
    lines.push('', '## Raw JSON', '', '```json', JSON.stringify({ summary, results }, null, 2), '```');
    await mkdir(dirname(join(ROOT, writePath)), { recursive: true });
    await writeFile(join(ROOT, writePath), lines.join('\n') + '\n');
    console.log('Wrote', writePath);
  }

  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
