#!/usr/bin/env node
/**
 * Record metro evaluation metrics (Qloo vs baselines) into packages/fixtures/src/eval/results.json.
 * Usage: QLOO_API_KEY=... node scripts/eval-metros.mjs
 * Without QLOO_API_KEY: records fixture-backed sites only (partial).
 */
import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT_PATH = join(ROOT, 'packages/fixtures/src/eval/results.json');
const RADIUS_KM = 10;
const QLOO_API_KEY = process.env.QLOO_API_KEY;
const QLOO_BASE_URL = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';

/** US retail corridors (varied density). fixtureId set when recorded insights exist in @leaseup/fixtures. */
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
    id: 'williamsburg',
    label: 'Williamsburg, Brooklyn',
    address: '240 Bedford Ave, Brooklyn, NY 11249',
    latitude: 40.7170431,
    longitude: -73.9588026,
    density: 'urban',
  },
  {
    id: 'buckhead',
    label: 'Buckhead, Atlanta',
    address: '3500 Peachtree Rd NE, Atlanta, GA 30326',
    latitude: 33.8536,
    longitude: -84.3625,
    density: 'suburban',
  },
  {
    id: 'pearl-portland',
    label: 'Pearl District, Portland',
    address: '1022 NW Marshall St, Portland, OR 97209',
    latitude: 45.5309,
    longitude: -122.6816,
    density: 'urban',
  },
  {
    id: 'scottsdale',
    label: 'Scottsdale, Arizona',
    address: '7014 E Camelback Rd, Scottsdale, AZ 85251',
    latitude: 33.5023,
    longitude: -111.9281,
    density: 'suburban',
  },
  {
    id: 'woodlands',
    label: 'The Woodlands, Texas',
    address: '9595 Six Pines Dr, The Woodlands, TX 77380',
    latitude: 30.1658,
    longitude: -95.4613,
    density: 'suburban',
  },
  {
    id: 'plano',
    label: 'Plano, Texas',
    address: '6121 W Park Blvd, Plano, TX 75093',
    latitude: 33.0262,
    longitude: -96.8317,
    density: 'suburban',
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
    id: 'miami-design',
    label: 'Miami Design District',
    address: '140 NE 39th St, Miami, FL 33137',
    latitude: 25.8134,
    longitude: -80.1924,
    density: 'urban',
  },
  {
    id: 'nashville-gulch',
    label: 'The Gulch, Nashville',
    address: '1200 4th Ave S, Nashville, TN 37210',
    latitude: 36.1514,
    longitude: -86.7789,
    density: 'urban',
  },
  {
    id: 'cherry-creek',
    label: 'Cherry Creek, Denver',
    address: '3000 E 1st Ave, Denver, CO 80206',
    latitude: 39.717,
    longitude: -104.953,
    density: 'suburban',
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
const { computeBacktest } = await import('../packages/fixtures/dist/backtest.js');
const { orderInsightsByNationalStoreCount } = await import('../packages/fixtures/dist/ranking.js');
const { expectedRandomPresentInTop10 } = await import('../packages/fixtures/dist/landing-random-baseline.js');

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
      Authorization: `Bearer ${QLOO_API_KEY}`,
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

function scoreSite(site, insights) {
  const lat = site.latitude;
  const lon = site.longitude;
  const qloo = computeBacktest(insights, lat, lon, RADIUS_KM);
  const chainOrdered = orderInsightsByNationalStoreCount(insights);
  const chain = computeBacktest(chainOrdered, lat, lon, RADIUS_KM);
  const randomExpected = expectedRandomPresentInTop10(insights, lat, lon, RADIUS_KM);
  const pool = chainOrdered.length;
  return {
    status: 'recorded',
    qlooPresentInTop10: qloo.presentInTop10,
    chainSizePresentInTop10: chain.presentInTop10,
    expectedRandomPresentInTop10: randomExpected,
    liftVsChainSize: qloo.presentInTop10 - chain.presentInTop10,
    liftVsRandomExpected: qloo.presentInTop10 - randomExpected,
    precisionAt10Qloo: qloo.precisionAt10,
    precisionAt10ChainSize: chain.precisionAt10,
    brandsInPool: pool,
  };
}

const rows = [];
let qlooSource = 'none';

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
      qlooSource = 'live';
      await new Promise((r) => setTimeout(r, 800));
    } else if (site.fixtureId && FIXTURE_BY_ID[site.fixtureId]) {
      insights = FIXTURE_BY_ID[site.fixtureId].insights;
      if (qlooSource === 'none') qlooSource = 'fixtures';
    }

    if (!insights || insights.length === 0) {
      rows.push({ ...base, status: 'pending_qloo' });
      continue;
    }

    rows.push({ ...base, ...scoreSite(site, insights) });
  } catch (err) {
    console.error(`Skip ${site.label}:`, err.message);
    rows.push({ ...base, status: 'pending_qloo' });
  }
}

const recorded = rows.filter((r) => r.status === 'recorded');
const recordingStatus =
  recorded.length === 0 ? 'empty' : recorded.length === rows.length ? 'complete' : 'partial';

let recordingNote = '';
if (!QLOO_API_KEY) {
  recordingNote =
    'QLOO_API_KEY was not set. Only fixture-backed metros were scored. Run: QLOO_API_KEY=... node scripts/eval-metros.mjs';
} else if (recordingStatus === 'partial') {
  recordingNote = 'Some metros could not be scored from live Qloo; re-run after checking API limits.';
} else if (recordingStatus === 'complete') {
  recordingNote = 'All metros scored from live Qloo insights.';
} else {
  recordingNote = 'No metros recorded. Set QLOO_API_KEY and re-run scripts/eval-metros.mjs.';
}

const summary =
  recorded.length > 0
    ? {
        recordedCount: recorded.length,
        meanQlooPresentInTop10:
          recorded.reduce((s, r) => s + r.qlooPresentInTop10, 0) / recorded.length,
        meanChainSizePresentInTop10:
          recorded.reduce((s, r) => s + r.chainSizePresentInTop10, 0) / recorded.length,
        meanExpectedRandomPresentInTop10:
          recorded.reduce((s, r) => s + r.expectedRandomPresentInTop10, 0) / recorded.length,
        meanLiftVsChainSize:
          recorded.reduce((s, r) => s + r.liftVsChainSize, 0) / recorded.length,
      }
    : undefined;

const payload = {
  recordedAt: new Date().toISOString(),
  radiusKm: RADIUS_KM,
  qlooSource,
  recordingStatus,
  recordingNote,
  rows,
  summary,
};

await mkdir(join(ROOT, 'packages/fixtures/src/eval'), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', OUT_PATH);
console.log(
  `Status: ${recordingStatus} (${recorded.length}/${rows.length} metros, source=${qlooSource})`
);
