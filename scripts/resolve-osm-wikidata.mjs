#!/usr/bin/env node
/**
 * Resolve Wikidata QIDs for tracked brands (Wikidata API, polite rate limit).
 * Merges into data/brands/osm-wikidata.json; run generate-osm-wikidata.mjs after.
 *
 * Usage:
 *   node scripts/resolve-osm-wikidata.mjs [--limit=100] [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'data/brands/osm-wikidata.json');
const resolvedPath = join(root, 'data/brands/resolved_brand_ids.json');
const tilesBrandsPath = join(root, 'apps/worker/public/tiles/brands.json');
const trackedPath = join(root, 'apps/worker/src/data/tracked-brand-ids.ts');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function loadTracked() {
  const ids = [];
  for (const line of readFileSync(trackedPath, 'utf8').split('\n')) {
    const m = line.match(/"([0-9A-F-]{36})"/i);
    if (m) ids.push(m[1]);
  }
  return ids;
}

async function searchWikidata(name) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', name);
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('type', 'item');
  url.searchParams.set('limit', '8');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LeaseUp-OSM-Wikidata-Resolver/1.0' },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.search ?? [];
}

function pickQid(name, hits) {
  const want = normalizeName(name);
  for (const hit of hits) {
    const label = normalizeName(hit.label ?? '');
    const desc = (hit.description ?? '').toLowerCase();
    if (label === want) return hit.id;
    if (label.startsWith(want) || want.startsWith(label)) {
      if (/retail|restaurant|chain|brand|company|store|coffee|bank/i.test(desc)) {
        return hit.id;
      }
    }
  }
  for (const hit of hits) {
    if (normalizeName(hit.label ?? '') === want) return hit.id;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 100;

  const existing = JSON.parse(readFileSync(outPath, 'utf8'));
  const manualPath = join(root, 'data/brands/osm-wikidata-manual.json');
  const manual = JSON.parse(readFileSync(manualPath, 'utf8'));
  const map = Object.fromEntries(
    Object.entries(existing).filter(([k]) => !k.startsWith('comment') && !k.startsWith('_'))
  );
  for (const [id, qid] of Object.entries(manual)) {
    if (id.startsWith('_')) continue;
    map[id] = qid;
  }

  const resolved = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  const nameById = new Map(resolved.map((r) => [r.qloo_entity_id, r.name]));
  const tiles = JSON.parse(readFileSync(tilesBrandsPath, 'utf8'));
  const countById = new Map(tiles.brands.map((b) => [b.id, b.count ?? 0]));

  const tracked = loadTracked();
  const ranked = tracked
    .map((id) => ({ id, name: nameById.get(id) ?? id, count: countById.get(id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const need = ranked.filter((r) => !map[r.id] && r.name).slice(0, limit);
  console.log(
    JSON.stringify({
      event: 'wikidata_resolve_plan',
      existing: Object.keys(map).length,
      toResolve: need.length,
      limit,
      dryRun,
    })
  );

  let added = 0;
  for (let i = 0; i < need.length; i++) {
    const { id, name } = need[i];
    const hits = await searchWikidata(name);
    const qid = pickQid(name, hits);
    console.log(
      JSON.stringify({
        event: 'wikidata_resolve',
        i: i + 1,
        total: need.length,
        id,
        name,
        qid,
        topHit: hits[0]?.label,
      })
    );
    if (qid) {
      map[id] = qid;
      added += 1;
    }
    await sleep(1100);
  }

  const doc = {
    _comment:
      'Wikidata QIDs for US Overpass brand:wikidata snapshot queries. Regenerate map: node scripts/generate-osm-wikidata.mjs',
    ...map,
  };

  if (!dryRun) {
    writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  }
  console.log(JSON.stringify({ event: 'wikidata_resolve_done', total: Object.keys(map).length, added }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
