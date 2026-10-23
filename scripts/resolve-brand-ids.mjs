#!/usr/bin/env node
/**
 * Resolve Qloo brand entity IDs for chain names (requires QLOO_API_KEY).
 *
 * Usage:
 *   QLOO_API_KEY=xxx node scripts/resolve-brand-ids.mjs --names "Madewell,Target"
 */

const QLOO_API_KEY = process.env.QLOO_API_KEY;
if (!QLOO_API_KEY) {
  console.error('QLOO_API_KEY is required');
  process.exit(1);
}

const base = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const namesArg = process.argv.find((a, i) => process.argv[i - 1] === '--names');
const names = (namesArg || '').split(',').map((n) => n.trim()).filter(Boolean);

if (names.length === 0) {
  console.error('Pass --names "Brand A,Brand B"');
  process.exit(1);
}

for (const name of names) {
  const url = new URL('/v2/search', base);
  url.searchParams.set('query', name);
  url.searchParams.set('filter.type', 'urn:entity:brand');
  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': QLOO_API_KEY, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(name, res.status, res.statusText);
    continue;
  }
  const data = await res.json();
  const hit = data?.results?.entities?.[0];
  console.log(JSON.stringify({ name, entity_id: hit?.entity_id, label: hit?.name }));
}
