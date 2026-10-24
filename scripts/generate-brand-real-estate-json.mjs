#!/usr/bin/env node
/**
 * Build packages/fixtures/src/brand-real-estate.json from resolved entity IDs.
 * Run after editing VERIFIED below, then: node scripts/check-brand-real-estate-urls.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { assertParentPortalAllowed } from './brand-real-estate-parent-map.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resolved = JSON.parse(readFileSync(join(root, 'data/brands/resolved_brand_ids.json'), 'utf8'));
const byName = new Map(resolved.map((r) => [r.name.toLowerCase(), r]));

/**
 * Official real-estate pages only when HTML <title> or <h1> contains real estate,
 * site selection, leasing, or property (see brand-real-estate-page-verify.mjs).
 * Re-audited 2026-10-24; bot-blocked or soft-404 URLs are omitted (search fallback).
 */
const VERIFIED_AT = '2026-10-24';
const GAP_INC_RE = 'https://www.gapinc.com/en-us/investors/real-estate';
const VERIFIED = [
  ['Athleta', GAP_INC_RE],
  ['Banana Republic', GAP_INC_RE],
  ['Burlington', 'https://www.burlington.com/real-estate'],
  ["Dave & Buster's", 'https://www.daveandbusters.com/real-estate'],
  ['Five Guys', 'https://www.fiveguys.com/real-estate'],
  ['Foot Locker', 'https://www.footlocker.com/real-estate'],
  ['Gap', GAP_INC_RE],
  ['MOD Pizza', 'https://modpizza.com/real-estate'],
  ['Old Navy', GAP_INC_RE],
  ['Orangetheory Fitness', 'https://www.orangetheory.com/real-estate'],
  ['Sprouts Farmers Market', 'https://www.sprouts.com/real-estate'],
  ['Wendy\'s', 'https://www.wendys.com/real-estate'],
  ['Whole Foods Market', 'https://www.wholefoodsmarket.com/company-info/real-estate'],
];

function searchFallback(name) {
  const q = encodeURIComponent(`${name} retail real estate site submission`);
  return `https://www.google.com/search?q=${q}`;
}

const entries = [];
const seen = new Set();

for (const [name, url] of VERIFIED) {
  const portal = assertParentPortalAllowed(name, url);
  if (!portal.ok) {
    console.error(portal.reason);
    process.exit(1);
  }
  const row = byName.get(name.toLowerCase());
  if (!row) {
    console.warn('skip unknown brand', name);
    continue;
  }
  const id = row.qloo_entity_id.toUpperCase();
  if (seen.has(id)) continue;
  seen.add(id);
  entries.push({
    entityId: id,
    name: row.name,
    status: 'verified',
    url,
    source: url,
    verifiedAt: VERIFIED_AT,
  });
}

/** Demo-chip brands from fixtures (top 50 each) plus tracked high-confidence chains. */
const demoImports = await import('../packages/fixtures/src/wicker-park.ts');
const boulder = await import('../packages/fixtures/src/boulder.ts');
const sevierville = await import('../packages/fixtures/src/sevierville.ts');

const priorityNames = new Set();
for (const f of [demoImports.wickerparkFixture, boulder.boulderFixture, sevierville.seviervilleFixture]) {
  for (const i of f.insights.slice(0, 50)) {
    priorityNames.add(i.name.toLowerCase());
  }
}

for (const r of resolved) {
  if (r.confidence !== 'high' && r.confidence !== 'medium') continue;
  priorityNames.add(r.name.toLowerCase());
}

for (const key of priorityNames) {
  const row = byName.get(key);
  if (!row) continue;
  const id = row.qloo_entity_id.toUpperCase();
  if (seen.has(id)) continue;
  seen.add(id);
  entries.push({
    entityId: id,
    name: row.name,
    status: 'not_yet_found',
    searchUrl: searchFallback(row.name),
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name));

const out = {
  version: 1,
  updatedAt: VERIFIED_AT,
  entries,
};

const outPath = join(root, 'packages/fixtures/src/brand-real-estate.json');
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
const verifiedCount = entries.filter((e) => e.status === 'verified').length;
console.log(`Wrote ${entries.length} entries (${verifiedCount} verified) to ${outPath}`);
