/**
 * Record live Qloo audience insights for demo "Why <brand>?" cards.
 *
 * Two kinds of raw recordings, both from GET /v2/insights?filter.type=urn:audience:
 *   - local:  signal.location (demo chip pin, 10 km), no brand signal
 *             -> brand-explainability/local-audiences/<chip>.json
 *   - brand:  signal.interests.entities=<brand>, no location signal
 *             -> brand-explainability/brand-audiences/<brandEntityId>.json
 * Normalized rows (name, entity id, affinity copied verbatim) are what the app imports;
 * the untouched API bodies go to brand-explainability/raw/ for audit and are not bundled.
 *
 * The Why card only shows an audience when it over-indexes for the brand
 * (brand-only affinity above Qloo's 0.5 neutral baseline, see
 * qloo-brand-taste-overlap.ts) AND appears in the chip's local top audiences.
 * Nothing here is mocked; there is no replay mode.
 *
 * Usage (key via env only, never committed):
 *   QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs            # everything
 *   QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder_ulta wicker_tjmaxx
 *   QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder    # one chip, all its brands
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { boulderFixture } = require('../packages/fixtures/dist/boulder.js');
const { wickerparkFixture } = require('../packages/fixtures/dist/wicker-park.js');
const { seviervilleFixture } = require('../packages/fixtures/dist/sevierville.js');

const key = process.env.QLOO_API_KEY;
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const TAKE = 50;
const RADIUS_KM = 10;

const CHIPS = {
  boulder: boulderFixture,
  wicker: wickerparkFixture,
  sevierville: seviervilleFixture,
};

/** Every brand pitched on the three demo chips (demo analyze, Oct 2026). */
const BRANDS = {
  '0F77E9A4-121C-4941-ACE1-28502DBF1865': 'Ulta',
  'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6': 'TJ Maxx',
  '81EC4A41-53FB-47FD-995A-B8AE3EE90652': 'Old Navy',
  '423EDCAF-1289-474E-9982-0CC39A5BAEFE': 'Hobby Lobby',
  'D3310425-7161-41FC-8C2C-5435AF0F0A5B': "Victoria's Secret",
  '2D890327-8794-4C5A-898F-FFF0323325CF': 'American Eagle Outfitters',
  '108EB684-257B-42D7-84E5-6E9D8BE3E793': 'H&M',
  'AC8F9047-F23D-4A54-BBAA-A3CBD2991C02': 'Vans',
  'DB37F394-B330-4BFC-A14B-42A53B9CF7D9': 'Express',
  'A4F0BE29-87A4-4074-9ABB-21B215E532FD': 'J.Crew',
  '09C15518-A1F2-45C3-AA01-629D86330E27': 'Aerie',
  'C306B282-6425-46DF-98F0-D976C6A65B1E': 'Coach',
  'C69202E6-9A83-4BD6-A720-ECAB9DB2AE52': 'Michaels',
  'A7E4F56C-19A7-4166-A4EA-EC77A59C3DC9': 'Marshalls',
  '945C90D2-07D7-43B3-98FE-C437DE7A6D16': "Kohl's",
  '002A706B-424B-40FB-8BE5-D99E706B1CC4': 'HomeGoods',
  '096B986E-3D63-44F4-BE44-F85D52A2979D': "Trader Joe's",
  '2C5054E1-8691-4F52-83CD-310D029BA6A3': 'Sephora',
  '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23': 'Whole Foods Market',
};

/** Pitched brands per demo chip (packages/fixtures/src/brand-explainability/chip-brands.json). */
const CHIP_BRANDS = JSON.parse(
  readFileSync(
    join(process.cwd(), 'packages/fixtures/src/brand-explainability/chip-brands.json'),
    'utf8',
  ),
);

/** Shorthand targets like boulder_ulta / wicker_tjmaxx. */
const ALIASES = {
  boulder_ulta: {
    chip: 'boulder',
    brand: '0F77E9A4-121C-4941-ACE1-28502DBF1865',
  },
  wicker_tjmaxx: {
    chip: 'wicker',
    brand: 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6',
  },
};

let calls = 0;

function normalizeAudienceRows(rawJson) {
  const list = rawJson?.results?.audiences ?? rawJson?.results?.entities ?? [];
  return list
    .map((row) => ({
      entityId: String(row.entity_id ?? row.id),
      name: String(row.name ?? row.entity_id ?? '').trim(),
      affinity: typeof row.query?.affinity === 'number' ? row.query.affinity : 0,
    }))
    .filter((row) => row.entityId && row.name);
}

async function fetchAudiences({ location, brandEntityId }) {
  const url = new URL('/v2/insights', baseUrl);
  url.searchParams.set('filter.type', 'urn:audience');
  if (location) {
    url.searchParams.set('signal.location', `POINT(${location.longitude} ${location.latitude})`);
    url.searchParams.set('signal.location.radius', String(RADIUS_KM * 1000));
  }
  if (brandEntityId) url.searchParams.set('signal.interests.entities', brandEntityId);
  url.searchParams.set('take', String(TAKE));
  calls += 1;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Api-Key': key },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Qloo urn:audience ${res.status}: ${text.slice(0, 240)}`);
  // The key travels only in the header; the URL we store has no secret in it.
  return { json: JSON.parse(text), url: url.toString() };
}

function write(file, payload) {
  const { raw, ...normalized } = payload;
  writeFileSync(file, JSON.stringify(normalized, null, 2) + '\n');
  const rawFile = join(dirname(file), '..', 'raw', `${basename(dirname(file))}-${basename(file)}`);
  mkdirSync(dirname(rawFile), { recursive: true });
  writeFileSync(rawFile, JSON.stringify({ url: payload.provenance.url, body: raw }) + '\n');
  console.log('Wrote', file, 'and', rawFile);
}

async function recordLocal(chip, outDir) {
  const file = join(outDir, 'local-audiences', `${chip}.json`);
  if (existsSync(file) && process.env.RECORD_SKIP_EXISTING === '1') return;
  const { latitude, longitude } = CHIPS[chip].location;
  const { json, url } = await fetchAudiences({
    location: { latitude, longitude },
  });
  const rows = normalizeAudienceRows(json);
  console.log(`local ${chip}: ${rows.length} audiences`);
  write(file, {
    chip,
    location: { latitude, longitude },
    radiusKm: RADIUS_KM,
    audiences: rows,
    raw: json,
    provenance: {
      recordedAt: new Date().toISOString(),
      host: baseUrl,
      url,
      live: true,
    },
  });
}

async function recordBrand(brandEntityId, outDir) {
  const file = join(outDir, 'brand-audiences', `${brandEntityId}.json`);
  if (existsSync(file) && process.env.RECORD_SKIP_EXISTING === '1') return;
  const { json, url } = await fetchAudiences({ brandEntityId });
  const rows = normalizeAudienceRows(json);
  console.log(`brand ${BRANDS[brandEntityId]}: ${rows.length} audiences`);
  write(file, {
    brandEntityId,
    brandName: BRANDS[brandEntityId],
    audiences: rows,
    raw: json,
    provenance: {
      recordedAt: new Date().toISOString(),
      host: baseUrl,
      url,
      live: true,
    },
  });
}

async function main() {
  if (!key) {
    console.error('Set QLOO_API_KEY (env only) to record live fixtures. There is no mock mode.');
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const chips = new Set();
  const brands = new Set();
  for (const arg of args.length ? args : Object.keys(CHIP_BRANDS)) {
    if (ALIASES[arg]) {
      chips.add(ALIASES[arg].chip);
      brands.add(ALIASES[arg].brand);
    } else if (CHIP_BRANDS[arg]) {
      chips.add(arg);
      for (const b of CHIP_BRANDS[arg]) brands.add(b);
    } else {
      throw new Error(`Unknown target ${arg}`);
    }
  }
  const outDir = join(process.cwd(), 'packages/fixtures/src/brand-explainability');
  mkdirSync(join(outDir, 'local-audiences'), { recursive: true });
  mkdirSync(join(outDir, 'brand-audiences'), { recursive: true });
  for (const chip of chips) await recordLocal(chip, outDir);
  for (const brand of brands) await recordBrand(brand, outDir);
  console.log(`Qloo calls this run: ${calls}`);
  console.log(
    'Next: node scripts/compact-brand-explainability.mjs (packs recordings for the web app and the worker ASSETS copy)',
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
