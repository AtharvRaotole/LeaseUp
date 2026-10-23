#!/usr/bin/env node
/**
 * Resolve Qloo brand entity IDs (requires QLOO_API_KEY).
 * Uses GET /search (results[]), sequential with 1.1s spacing and 429 backoff.
 *
 * Usage:
 *   QLOO_API_KEY=xxx node scripts/resolve-brand-ids.mjs --names "Madewell,Target"
 *   QLOO_API_KEY=xxx node scripts/resolve-brand-ids.mjs --names-file names.txt --out resolved.jsonl
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';

const KEY = process.env.QLOO_API_KEY;
if (!KEY) {
  console.error('QLOO_API_KEY is required');
  process.exit(1);
}

const base = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const namesArg = process.argv.find((a, i) => process.argv[i - 1] === '--names');
const namesFile = process.argv.find((a, i) => process.argv[i - 1] === '--names-file');
const outFile = process.argv.find((a, i) => process.argv[i - 1] === '--out') || 'resolved.jsonl';

const names = namesArg
  ? namesArg.split(',').map((n) => n.trim()).filter(Boolean)
  : readFileSync(namesFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);

writeFileSync(outFile, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const name of names) {
  let data = null;
  let status = 0;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const url = new URL('/search', base);
    url.searchParams.set('query', name);
    url.searchParams.set('types', 'urn:entity:brand');
    url.searchParams.set('take', '5');
    const response = await fetch(url, {
      headers: { 'X-Api-Key': KEY, Accept: 'application/json' },
    });
    status = response.status;
    if (response.status === 429) {
      await sleep(attempt * 5000);
      continue;
    }
    if (response.ok) {
      data = await response.json();
      break;
    }
    break;
  }

  const hits = (data?.results || []).slice(0, 5).map((h) => ({
    entity_id: h.entity_id,
    name: h.name,
    popularity: h.popularity,
  }));

  appendFileSync(outFile, `${JSON.stringify({ name, status, hits })}\n`);
  await sleep(1100);
}

console.log(`Wrote ${names.length} rows to ${outFile}`);
