#!/usr/bin/env node
/** Retile OSM snapshot from cached raw Overpass JSON and write before/after stats. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandsPath = join(root, 'data/osm-snapshot/tiles/brands.json');

function snapshotStats() {
  if (!existsSync(brandsPath)) {
    return { totalPoints: 0, brandCount: 0, top20: [] };
  }
  const doc = JSON.parse(readFileSync(brandsPath, 'utf8'));
  const brands = doc.brands ?? [];
  let totalPoints = 0;
  for (const b of brands) totalPoints += b.count ?? 0;
  const top20 = [...brands].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 20);
  return { totalPoints, brandCount: brands.length, top20 };
}

const before = snapshotStats();
writeFileSync(join(root, 'data/osm-snapshot/retile-before.json'), JSON.stringify(before, null, 2));

console.log(JSON.stringify({ event: 'osm_retile_start', before }));

execSync('node scripts/build-osm-snapshot.mjs --retile-only', { stdio: 'inherit', cwd: root });

const after = snapshotStats();
const report = { recordedAt: new Date().toISOString(), before, after };
writeFileSync(join(root, 'data/osm-snapshot/retile-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ event: 'osm_retile_done', report }, null, 2));
