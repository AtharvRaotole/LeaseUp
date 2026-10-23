#!/usr/bin/env node
/**
 * Build US OpenStreetMap brand snapshot from Overpass (run on VM, not Workers).
 * Output:
 *   data/osm-snapshot/manifest.json
 *   data/osm-snapshot/raw/<brandId>.json (gitignored)
 *   data/osm-snapshot/tiles/brands.json + <gh3>.json
 *   apps/worker/src/data/osm-snapshot-meta.ts
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { osmTagsMatchBrand } from './lib/osm-brand-match.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data/osm-snapshot/raw');
const tilesDir = join(root, 'data/osm-snapshot/tiles');
const manifestPath = join(root, 'data/osm-snapshot/manifest.json');
const wikidataPath = join(root, 'data/brands/osm-wikidata.json');
const resolvedPath = join(root, 'data/brands/resolved_brand_ids.json');
const trackedPath = join(root, 'apps/worker/src/data/tracked-brand-ids.ts');
const metaOut = join(root, 'apps/worker/src/data/osm-snapshot-meta.ts');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat, lon, precision = 3) {
  let idx = 0;
  let bit = 0;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';
  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx = idx * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadTrackedIds() {
  const text = readFileSync(trackedPath, 'utf8');
  const ids = [];
  for (const line of text.split('\n')) {
    const match = line.match(/"([0-9A-F-]{36})"/i);
    if (match) ids.push(match[1]);
  }
  if (ids.length === 0) throw new Error('Could not parse tracked-brand-ids.ts');
  return ids;
}

function loadNameById() {
  const rows = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  const map = new Map();
  for (const row of rows) {
    if (row.qloo_entity_id && row.name) map.set(row.qloo_entity_id, row.name);
  }
  return map;
}

function loadWikidataOverrides() {
  const raw = JSON.parse(readFileSync(wikidataPath, 'utf8'));
  const map = new Map();
  for (const [id, qid] of Object.entries(raw)) {
    if (!id.startsWith('comment')) map.set(id, qid);
  }
  return map;
}

function buildQuery(qid) {
  return `[out:json][timeout:180];area["ISO3166-1"="US"][admin_level=2]->.us;nwr["brand:wikidata"="${qid}"](area.us);out center tags;`;
}

async function postOverpass(query) {
  let delay = 4000;
  const maxAttempts = Number(process.env.OSM_OVERPASS_ATTEMPTS || '5');
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const endpoint of ENDPOINTS) {
      const host = new URL(endpoint).host;
      const started = Date.now();
      try {
        const controller = new AbortController();
        const timeoutMs = Number(process.env.OSM_OVERPASS_TIMEOUT_MS || '120000');
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'LeaseUp-OSM-Snapshot/1.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Date.now() - started;
        if (res.status === 429 || res.status === 504) {
          console.log(JSON.stringify({ event: 'overpass_retry', host, status: res.status, latencyMs }));
          await sleep(delay);
          delay = Math.min(delay * 2, 60_000);
          continue;
        }
        if (!res.ok) {
          console.log(JSON.stringify({ event: 'overpass_fail', host, status: res.status, latencyMs }));
          continue;
        }
        const json = await res.json();
        return { json, endpoint: host, latencyMs };
      } catch (err) {
        const latencyMs = Date.now() - started;
        console.log(
          JSON.stringify({
            event: 'overpass_error',
            host,
            latencyMs,
            aborted: err?.name === 'AbortError',
            message: err?.message,
          })
        );
      }
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 60_000);
  }
  return null;
}

function parseElements(elements) {
  const points = [];
  for (const el of elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    points.push({ lat, lon, tags: el.tags ?? {} });
  }
  return points;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const retileOnly = args.has('--retile-only');
  const limit = Number(process.env.OSM_SNAPSHOT_LIMIT || '0');

  const tracked = loadTrackedIds();
  const nameById = loadNameById();
  const overrides = loadWikidataOverrides();

  mkdirSync(rawDir, { recursive: true });
  mkdirSync(tilesDir, { recursive: true });

  const recordedAt = new Date().toISOString();
  const manifest = {
    recordedAt,
    displayLabel: 'OpenStreetMap snapshot, Oct 23, 2026',
    brands: {},
    failedBrands: [],
    missingWikidata: [],
  };

  const toFetch = [];

  for (const brandId of tracked) {
    const name = nameById.get(brandId) ?? brandId;
    const qid = overrides.get(brandId);
    const wikidataSource = qid ? 'atp' : null;
    if (!qid) {
      manifest.missingWikidata.push({ brandId, name });
      continue;
    }
    toFetch.push({ brandId, name, qid, wikidataSource });
  }

  const slice = limit > 0 ? toFetch.slice(0, limit) : toFetch;
  console.log(
    JSON.stringify({
      event: 'osm_snapshot_plan',
      tracked: tracked.length,
      withWikidata: toFetch.length,
      missingWikidata: manifest.missingWikidata.length,
      fetching: slice.length,
    })
  );

  let totalElements = 0;
  for (let i = 0; i < slice.length; i++) {
    const { brandId, name, qid, wikidataSource } = slice[i];
    const query = buildQuery(qid);
    const rawPath = join(rawDir, `${brandId}.json`);

    if (existsSync(rawPath) && !args.has('--force')) {
      const cached = JSON.parse(readFileSync(rawPath, 'utf8'));
      const cacheOk =
        cached.meta?.status === 'ok' && (retileOnly || cached.meta?.qid === qid);
      if (cacheOk) {
        manifest.brands[brandId] = cached.meta;
        totalElements += cached.meta.elementCount ?? 0;
        console.log(JSON.stringify({ event: 'osm_snapshot_skip', brandId, i: i + 1, total: slice.length }));
        continue;
      }
    }

    if (retileOnly) {
      manifest.brands[brandId] = {
        status: 'missing_raw',
        name,
        qid,
        wikidataSource,
        elementCount: 0,
      };
      console.log(JSON.stringify({ event: 'osm_snapshot_no_raw', brandId, i: i + 1, total: slice.length }));
      continue;
    }

    if (dryRun) {
      manifest.brands[brandId] = { status: 'planned', name, qid, wikidataSource, query };
      continue;
    }

    console.log(JSON.stringify({ event: 'osm_snapshot_fetch', brandId, name, qid, i: i + 1, total: slice.length }));
    const result = await postOverpass(query);
    if (!result) {
      manifest.failedBrands.push({ brandId, name, qid, error: 'overpass_exhausted' });
      manifest.brands[brandId] = {
        status: 'failed',
        name,
        qid,
        wikidataSource,
        error: 'overpass_exhausted',
        query,
        endpoint: null,
        elementCount: 0,
      };
    } else {
      const elements = result.json.elements ?? [];
      const points = parseElements(elements);
      totalElements += points.length;
      const meta = {
        status: 'ok',
        name,
        qid,
        wikidataSource,
        query,
        endpoint: result.endpoint,
        latencyMs: result.latencyMs,
        elementCount: points.length,
      };
      manifest.brands[brandId] = meta;
      writeFileSync(rawPath, JSON.stringify({ meta, elements, points }, null, 0));
    }

    if (i < slice.length - 1) {
      const spacing = 3000 + Math.floor(Math.random() * 2000);
      await sleep(spacing);
    }
  }

  if (dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Dry run complete');
    return;
  }

  const brandIndex = new Map();
  const brands = [];
  for (const brandId of tracked) {
    const entry = manifest.brands[brandId];
    if (!entry || entry.status !== 'ok') continue;
    const idx = brands.length;
    brands.push({ id: brandId, name: entry.name, qid: entry.qid, count: entry.elementCount });
    brandIndex.set(brandId, idx);
  }

  const tiles = new Map();
  const perBrandCounts = new Map();
  let pointCount = 0;
  for (const brandId of brands.map((b) => b.id)) {
    const rawPath = join(rawDir, `${brandId}.json`);
    if (!existsSync(rawPath)) continue;
    const { points } = JSON.parse(readFileSync(rawPath, 'utf8'));
    const bIdx = brandIndex.get(brandId);
    const brandMeta = manifest.brands[brandId];
    const matchSpec = {
      expectedQid: brandMeta?.qid,
      names: [brandMeta?.name ?? brandId],
    };
    for (const p of points) {
      if (!osmTagsMatchBrand(p.tags ?? {}, matchSpec)) continue;
      const gh = encodeGeohash(p.lat, p.lon, 3);
      if (!tiles.has(gh)) tiles.set(gh, []);
      tiles.get(gh).push([bIdx, p.lat, p.lon]);
      perBrandCounts.set(bIdx, (perBrandCounts.get(bIdx) ?? 0) + 1);
      pointCount += 1;
    }
  }

  for (const row of brands) {
    const idx = brandIndex.get(row.id);
    if (idx === undefined) continue;
    row.count = perBrandCounts.get(idx) ?? 0;
  }

  writeFileSync(
    join(tilesDir, 'brands.json'),
    JSON.stringify({ generated: recordedAt, recordedAt, brands })
  );

  let totalBytes = 0;
  let maxTile = 0;
  for (const [gh, stores] of tiles.entries()) {
    const body = JSON.stringify({ gh, stores });
    writeFileSync(join(tilesDir, `${gh}.json`), body);
    totalBytes += body.length;
    if (body.length > maxTile) maxTile = body.length;
  }

  manifest.tiles = {
    tileCount: tiles.size,
    totalBytes,
    maxTileBytes: maxTile,
    pointCount,
    brandCount: brands.length,
  };
  manifest.totalElements = totalElements;
  manifest.succeededBrands = brands.length;
  manifest.failedCount = manifest.failedBrands.length;

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const statusMap = {};
  for (const brandId of tracked) {
    const entry = manifest.brands[brandId];
    if (!entry) statusMap[brandId] = 'missing';
    else if (entry.status === 'ok') statusMap[brandId] = 'ok';
    else if (entry.status === 'failed') statusMap[brandId] = 'failed';
    else statusMap[brandId] = 'missing';
  }

  writeFileSync(
    metaOut,
    `/** Generated by scripts/build-osm-snapshot.mjs */
export const OSM_SNAPSHOT_RECORDED_AT = '${recordedAt}';
export const OSM_SNAPSHOT_DISPLAY_LABEL = ${JSON.stringify(manifest.displayLabel)};
export const OSM_SNAPSHOT_BRAND_STATUS: Record<string, 'ok' | 'failed' | 'missing'> = ${JSON.stringify(statusMap, null, 2)};
`
  );

  const publicDir = join(root, 'apps/worker/public/osm-tiles');
  mkdirSync(publicDir, { recursive: true });
  for (const file of readdirSync(tilesDir)) {
    writeFileSync(join(publicDir, file), readFileSync(join(tilesDir, file)));
  }

  const { spawnSync } = await import('node:child_process');
  spawnSync(process.execPath, [join(root, 'scripts/apply-store-supplements.mjs')], {
    stdio: 'inherit',
    cwd: root,
  });

  console.log(JSON.stringify(manifest.tiles, null, 2));
  console.log(
    JSON.stringify(
      {
        succeededBrands: manifest.succeededBrands,
        failedCount: manifest.failedCount,
        missingWikidata: manifest.missingWikidata.length,
        totalElements,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
