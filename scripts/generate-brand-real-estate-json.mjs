#!/usr/bin/env node
/**
 * Build packages/fixtures/src/brand-real-estate.json from resolved entity IDs.
 * Run after editing VERIFIED below, then: node scripts/check-brand-real-estate-urls.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resolved = JSON.parse(readFileSync(join(root, 'data/brands/resolved_brand_ids.json'), 'utf8'));
const byName = new Map(resolved.map((r) => [r.name.toLowerCase(), r]));

/** Official brand-site real estate or site submission pages (curl-verified Oct 23, 2026). */
const VERIFIED = [
  ['7-Eleven', 'https://www.7-eleven.com/real-estate'],
  ['Abercrombie & Fitch', 'https://www.abercrombie.com/shop/us/real-estate'],
  ['Academy Sports + Outdoors', 'https://www.academy.com/real-estate'],
  ['Bath & Body Works', 'https://www.bathandbodyworks.com/real-estate'],
  ['Blaze Pizza', 'https://www.blazepizza.com/real-estate'],
  ['Burger King', 'https://www.bk.com/real-estate'],
  ['Burlington', 'https://www.burlington.com/real-estate'],
  ['Chipotle Mexican Grill', 'https://www.chipotle.com/contact-us'],
  ['DSW', 'https://www.dsw.com/en/us/real-estate'],
  ['Dillard\'s', 'https://www.dillards.com/real-estate'],
  ["Dunkin'", 'https://www.dunkindonuts.com/en/about/real-estate'],
  ['Firehouse Subs', 'https://www.firehousesubs.com/real-estate'],
  ['H-E-B', 'https://www.heb.com/real-estate'],
  ['Hollister', 'https://www.abercrombie.com/shop/us/real-estate'],
  ['IKEA', 'https://www.ikea.com/us/en/customer-service/shopping-at-ikea/real-estate-pub2d87ef20'],
  ['In-N-Out Burger', 'https://www.in-n-out.com/real-estate'],
  ["Jersey Mike's Subs", 'https://www.jerseymikes.com/real-estate'],
  ['Jimmy John\'s', 'https://www.jimmyjohns.com/real-estate/'],
  ['Krispy Kreme', 'https://www.krispykreme.com/real-estate'],
  ['LensCrafters', 'https://www.luxottica.com/en/real-estate/'],
  ['MOD Pizza', 'https://modpizza.com/real-estate'],
  ['Nike', 'https://www.nike.com/retail/real-estate'],
  ['Nordstrom', 'https://www.nordstrom.com/browse/about/real-estate'],
  ['Popeyes', 'https://www.popeyes.com/real-estate'],
  ['Publix', 'https://corporate.publix.com/real-estate'],
  ['Sam\'s Club', 'https://www.samsclub.com/content/real-estate'],
  ['Starbucks', 'https://retail.starbucks.com/'],
  ['Steak \'n Shake', 'https://www.steaknshake.com/real-estate'],
  ['Sunglass Hut', 'https://www.luxottica.com/en/real-estate/'],
  ['Taco Bell', 'https://www.tacobell.com/franchise'],
  ['Target', 'https://www.target.com/c/real-estate/-/N-4nav'],
  ['Ulta', 'https://www.ulta.com/company/real-estate'],
  ['Walgreens', 'https://www.walgreens.com/topic/real-estate.jsp'],
  ['Walmart', 'https://www.walmart.com/cp/real-estate/1228302'],
  ['Wendy\'s', 'https://www.wendys.com/real-estate'],
  ['Whataburger', 'https://whataburger.com/real-estate'],
  ['Whole Foods Market', 'https://www.wholefoodsmarket.com/company-info/real-estate'],
  ['Wingstop', 'https://www.wingstop.com/real-estate'],
];

function searchFallback(name) {
  const q = encodeURIComponent(`${name} retail real estate site submission`);
  return `https://www.google.com/search?q=${q}`;
}

const entries = [];
const seen = new Set();

for (const [name, url] of VERIFIED) {
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
  updatedAt: '2026-10-23',
  entries,
};

const outPath = join(root, 'packages/fixtures/src/brand-real-estate.json');
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
const verifiedCount = entries.filter((e) => e.status === 'verified').length;
console.log(`Wrote ${entries.length} entries (${verifiedCount} verified) to ${outPath}`);
