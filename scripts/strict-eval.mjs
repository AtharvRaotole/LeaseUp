#!/usr/bin/env node
/**
 * Record evaluation metrics into packages/fixtures/src/eval/strict-results.json
 * (or swap bundle path in eval/manifest.json). See scripts/eval/README.md
 */
import { execSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'packages/fixtures/src/eval/manifest.json');
const RADIUS_KM = 10;
const QLOO_API_KEY = process.env.QLOO_API_KEY;
const QLOO_BASE_URL = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';

/** Pilot sites only; replace or extend when the live API bundle arrives. */
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
const { computeStrictEval } = await import('../packages/fixtures/dist/strict-eval.js');
const { buildEvalMetricPanels } = await import('../packages/fixtures/dist/eval/present-metrics.js');

const FIXTURE_BY_ID = {
  wicker: wickerparkFixture,
  boulder: boulderFixture,
  sevierville: seviervilleFixture,
};

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const outPath = join(ROOT, 'packages/fixtures/src/eval', manifest.resultsBundle);

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
let dataSource = manifest.dataSource;

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
      dataSource = 'live';
      await new Promise((r) => setTimeout(r, 800));
    } else if (site.fixtureId && FIXTURE_BY_ID[site.fixtureId]) {
      insights = FIXTURE_BY_ID[site.fixtureId].insights;
    }

    if (!insights || insights.length === 0) {
      rows.push({ ...base, status: 'pending_qloo' });
      continue;
    }

    const siteMetrics = computeStrictEval(
      insights,
      site.latitude,
      site.longitude,
      RADIUS_KM,
      site.density
    );

    rows.push({
      ...base,
      status: 'recorded',
      siteMetrics,
      panels: buildEvalMetricPanels(siteMetrics),
    });
  } catch (err) {
    console.error(`Skip ${site.label}:`, err.message);
    rows.push({ ...base, status: 'pending_qloo' });
  }
}

const recorded = rows.filter((r) => r.status === 'recorded');

const payload = {
  manifestId: manifest.id,
  recordedAt: new Date().toISOString(),
  dataSource,
  siteSetId: manifest.siteSetId,
  recordingNote: QLOO_API_KEY
    ? 'Recorded from live Qloo insights API.'
    : 'Fixture-backed pilot sites only. Replace with live-eval bundle when ready.',
  rows,
  summary: {
    recordedCount: recorded.length,
  },
};

await mkdir(join(ROOT, 'packages/fixtures/src/eval'), { recursive: true });
await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', outPath);
console.log('Recorded', recorded.length, 'of', rows.length);
