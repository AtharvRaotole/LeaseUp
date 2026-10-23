/**
 * Record Qloo trade-area tag & audience insights for demo Why cards.
 *
 * Usage:
 *   QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs
 *   QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder wicker
 *
 * Writes packages/fixtures/src/brand-explainability/<chip>-<brandEntityId>.json
 * (raw API bodies + normalized rows; no API key stored).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { boulderFixture } = require('../packages/fixtures/dist/boulder.js');
const { wickerparkFixture } = require('../packages/fixtures/dist/wicker-park.js');
const { seviervilleFixture } = require('../packages/fixtures/dist/sevierville.js');

const key = process.env.QLOO_API_KEY;
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';

const TARGETS = {
  boulder: {
    fixture: boulderFixture,
    brandEntityId: '205AF33F-118E-4C49-9721-6BDBAF981DA0',
    brandName: 'Recreational Equipment Inc',
  },
  wicker: {
    fixture: wickerparkFixture,
    brandEntityId: '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23',
    brandName: 'Whole Foods Market',
  },
  sevierville: {
    fixture: seviervilleFixture,
    brandEntityId: '2C5054E1-8691-4F52-83CD-310D029BA6A3',
    brandName: 'Sephora',
  },
};

const FILTER_TYPES = [
  { kind: 'tag', filterType: 'urn:tag' },
  { kind: 'audience', filterType: 'urn:audience' },
];

function formatWktPoint(lon, lat) {
  return `POINT(${lon} ${lat})`;
}

function normalizeRows(rawJson, kind) {
  const results = rawJson?.results ?? {};
  const list =
    kind === 'tag'
      ? results.tags ?? results.entities ?? []
      : results.audiences ?? results.entities ?? [];

  const rows = list.map((row, index) => {
    const entityId = row.entity_id ?? row.tag_id ?? row.audience_id ?? row.id;
    const affinity = row.query?.affinity ?? row.affinity;
    const affinityRank = row.query?.affinity_rank ?? row.affinity_rank;
    return {
      entityId: String(entityId),
      name: String(row.name ?? entityId),
      affinity: typeof affinity === 'number' ? affinity : 0,
      affinityRank:
        typeof affinityRank === 'number'
          ? affinityRank
          : typeof affinity === 'number'
            ? affinity
            : index + 1,
    };
  });

  rows.sort((a, b) => {
    const rankA = a.affinityRank ?? 0;
    const rankB = b.affinityRank ?? 0;
    if (rankB !== rankA) return rankB - rankA;
    return b.affinity - a.affinity;
  });

  return rows.slice(0, 8);
}

async function fetchInsights(filterType, site, brandEntityId) {
  const url = new URL('/v2/insights', baseUrl);
  url.searchParams.set('filter.type', filterType);
  url.searchParams.set('signal.location', formatWktPoint(site.longitude, site.latitude));
  url.searchParams.set('signal.location.radius', String(Math.round(site.radiusKm * 1000)));
  url.searchParams.set('signal.interests.entities', brandEntityId);
  url.searchParams.set('take', '25');
  url.searchParams.set('feature.explainability', 'true');

  const headers = { Accept: 'application/json', 'X-Api-Key': key };
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Qloo ${filterType} ${res.status}: ${text.slice(0, 240)}`);
  }
  return { json: JSON.parse(text), url: url.toString() };
}

function loadMockRaw(chip, kind) {
  const path = join(
    process.cwd(),
    'packages/fixtures/src/brand-explainability/captures',
    `${chip}-${TARGETS[chip].brandEntityId}-${kind}.json`
  );
  if (!existsSync(path)) {
    throw new Error(`Missing mock capture ${path}`);
  }
  const envelope = JSON.parse(readFileSync(path, 'utf8'));
  return envelope.body ?? envelope;
}

async function main() {
  const useMock = process.argv.includes('--mock') || process.env.LEASEUP_EXPLAINABILITY_MOCK === '1';
  if (!key && !useMock) {
    console.error('Set QLOO_API_KEY to record explainability fixtures (or pass --mock).');
    process.exit(1);
  }

  const chips = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TARGETS);
  const outDir = join(process.cwd(), 'packages/fixtures/src/brand-explainability');
  mkdirSync(outDir, { recursive: true });

  for (const chip of chips) {
    const meta = TARGETS[chip];
    if (!meta) throw new Error(`Unknown chip ${chip}`);
    const { latitude, longitude } = meta.fixture.location;
    const site = { latitude, longitude, radiusKm: 10 };
    const recordedAt = new Date().toISOString();
    const payload = {
      chip,
      brandEntityId: meta.brandEntityId,
      brandName: meta.brandName,
      location: { latitude, longitude },
      radiusKm: 10,
      tags: [],
      audiences: [],
      raw: {},
      provenance: {
        recordedAt,
        host: baseUrl,
        note: 'API key stripped. Raw bodies stored under raw.*; normalized rows under tags/audiences.',
      },
    };

    for (const { kind, filterType } of FILTER_TYPES) {
      let json;
      let url;
      if (useMock) {
        json = loadMockRaw(chip, kind);
        url = `mock:captures/${chip}-${meta.brandEntityId}-${kind}.json`;
      } else {
        const fetched = await fetchInsights(filterType, site, meta.brandEntityId);
        json = fetched.json;
        url = fetched.url;
      }
      payload.raw[kind] = json;
      payload[kind === 'tag' ? 'tags' : 'audiences'] = normalizeRows(json, kind);
      payload.provenance[kind] = { filterType, url };
      console.log(chip, kind, payload[kind === 'tag' ? 'tags' : 'audiences'].length);
    }

    const file = join(outDir, `${chip}-${meta.brandEntityId}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
    console.log('Wrote', file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
