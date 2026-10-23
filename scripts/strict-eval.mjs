#!/usr/bin/env node
/**
 * Record strict Qloo evaluation (see docs/STRICT_EVAL_PROTOCOL.md).
 * Usage: node scripts/strict-eval.mjs
 *        QLOO_API_KEY=... node scripts/strict-eval.mjs
 */
import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT_PATH = join(ROOT, 'packages/fixtures/src/eval/strict-results.json');
const RADIUS_KM = 10;
const QLOO_API_KEY = process.env.QLOO_API_KEY;
const QLOO_BASE_URL = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';

const EVAL_SITES = [
  {
    id: 'wicker-park',
    label: 'Wicker Park, Chicago',
    address: '1574 N Milwaukee Ave, Chicago, IL 60622',
    latitude: 41.9099418,
    longitude: -87.6772824,
    density: 'urban',
    fixtureId: 'wicker',
  },
  {
    id: 'west-village-bleecker',
    label: 'West Village, Bleecker St',
    address: '350 Bleecker St, New York, NY 10014',
    latitude: 40.7322,
    longitude: -74.0034,
    density: 'urban',
  },
  {
    id: 'boulder',
    label: 'Pearl Street, Boulder',
    address: '1125 Pearl St, Boulder, CO 80302',
    latitude: 40.0176,
    longitude: -105.2796,
    density: 'urban',
    fixtureId: 'boulder',
  },
  {
    id: 'sevierville',
    label: 'Sevierville, Tennessee',
    address: '125 Collier Dr, Sevierville, TN 37862',
    latitude: 35.8684,
    longitude: -83.5619,
    density: 'tourist',
    fixtureId: 'sevierville',
  },
];

execSync('pnpm --filter @leaseup/fixtures build', { stdio: 'inherit', cwd: ROOT });

const { wickerparkFixture } = await import('../packages/fixtures/dist/wicker-park.js');
const { boulderFixture } = await import('../packages/fixtures/dist/boulder.js');
const { seviervilleFixture } = await import('../packages/fixtures/dist/sevierville.js');
const { computeStrictEval, strictEvalHonestSummary } = await import(
  '../packages/fixtures/dist/strict-eval.js'
);

const FIXTURE_BY_ID = {
  wicker: wickerparkFixture,
  boulder: boulderFixture,
  sevierville: seviervilleFixture,
};

function formatWktPoint(lon, lat) {
  return `POINT(${lon} ${lat})`;
}

async function fetchLiveInsights(site) {
  const url = new URL('/v2/insights', QLOO_BASE_URL);
  url.searchParams.set('filter.type', 'urn:entity:brand');
  url.searchParams.set('signal.location', formatWktPoint(site.longitude, site.latitude));
  url.searchParams.set('signal.location.radius', String(Math.round(RADIUS_KM * 1000)));
  url.searchParams.set('take', '50');
  url.searchParams.set('feature.explainability', 'true');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': QLOO_API_KEY,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Qloo ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  const entities = data.results?.entities ?? [];
  return entities.map((row) => ({
    entity_id: row.entity_id,
    name: row.name,
    query: row.query,
  }));
}

const rows = [];

for (const site of EVAL_SITES) {
  const base = {
    id: site.id,
    label: site.label,
    address: site.address,
    density: site.density,
  };

  try {
    let insights = null;
    if (QLOO_API_KEY) {
      insights = await fetchLiveInsights(site);
      await new Promise((r) => setTimeout(r, 800));
    } else if (site.fixtureId && FIXTURE_BY_ID[site.fixtureId]) {
      insights = FIXTURE_BY_ID[site.fixtureId].insights;
    }

    if (!insights || insights.length === 0) {
      rows.push({ ...base, status: 'pending_qloo' });
      continue;
    }

    const metrics = computeStrictEval(
      insights,
      site.latitude,
      site.longitude,
      RADIUS_KM,
      site.density
    );

    rows.push({
      ...base,
      status: 'recorded',
      metrics: {
        primaryMetricId: metrics.primaryMetricId,
        searchRadiusKm: metrics.searchRadiusKm,
        adaptiveRadiusKm: metrics.adaptiveRadiusKm,
        poolSize: metrics.poolSize,
        legacyPresentAt10Qloo: metrics.legacyPresentAt10Qloo,
        legacyPresentAt10Chain: metrics.legacyPresentAt10Chain,
        adaptivePresentAt10Qloo: metrics.adaptivePresentAt10Qloo,
        adaptivePresentAt10Chain: metrics.adaptivePresentAt10Chain,
        surprisePresentAt10Qloo: metrics.surprisePresentAt10Qloo,
        surprisePresentAt10Chain: metrics.surprisePresentAt10Chain,
        spearmanQloo: metrics.spearmanQloo,
        spearmanChain: metrics.spearmanChain,
        randomExpectedPresentAt10: metrics.randomExpectedPresentAt10,
        randomMonteCarloPresentAt10: metrics.randomMonteCarloPresentAt10,
        primaryWinner: metrics.primaryWinner,
        qlooBelowChainAdaptive: metrics.qlooBelowChainAdaptive,
        qlooBelowRandomExpected: metrics.qlooBelowRandomExpected,
        honestSummary: strictEvalHonestSummary(metrics),
      },
    });
  } catch (err) {
    console.error(`Skip ${site.label}:`, err.message);
    rows.push({ ...base, status: 'pending_qloo' });
  }
}

const recorded = rows.filter((r) => r.status === 'recorded');
const summary =
  recorded.length > 0
    ? {
        recordedCount: recorded.length,
        meanSpearmanQloo:
          recorded.reduce((s, r) => s + r.metrics.spearmanQloo, 0) / recorded.length,
        meanSpearmanChain:
          recorded.reduce((s, r) => s + r.metrics.spearmanChain, 0) / recorded.length,
        qlooPrimaryWins: recorded.filter((r) => r.metrics.primaryWinner === 'qloo').length,
        chainPrimaryWins: recorded.filter((r) => r.metrics.primaryWinner === 'chain').length,
        ties: recorded.filter((r) => r.metrics.primaryWinner === 'tie').length,
        sitesWhereQlooBelowChainAdaptive: recorded
          .filter((r) => r.metrics.qlooBelowChainAdaptive)
          .map((r) => r.id),
        sitesWhereLegacySaturated: recorded
          .filter((r) => r.metrics.legacyPresentAt10Qloo === 10)
          .map((r) => r.id),
      }
    : undefined;

const payload = {
  protocolDoc: 'docs/STRICT_EVAL_PROTOCOL.md',
  recordedAt: new Date().toISOString(),
  primaryMetricId: 'spearman_presence',
  rows,
  summary,
};

await mkdir(join(ROOT, 'packages/fixtures/src/eval'), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', OUT_PATH);
console.log('Recorded', recorded.length, 'of', rows.length);
