/**
 * Guards P0 box hotfixes that are on integration but not on production main (93f6560).
 * POI street labels, skip caching empty Nominatim candidate lists, report map !absolute layout.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const checks = [
  {
    file: 'apps/worker/src/lib/geocode-label.ts',
    includes: ['export function isPoiOnlyResult', 'export function formatPoiAddressLabel'],
  },
  {
    file: 'apps/worker/src/services/nominatim.ts',
    includes: [
      'formatPoiAddressLabel',
      'if (deduped.length === 0) return',
      'rankGeocodeCandidates',
    ],
  },
  {
    file: 'apps/web/src/components/report/ReportMapInner.tsx',
    includes: ['!absolute inset-0'],
  },
  {
    file: 'apps/web/src/components/brand/BrandReverseMap.tsx',
    includes: ['!absolute inset-0'],
  },
];

const failures = [];
for (const { file, includes } of checks) {
  let text;
  try {
    text = read(file);
  } catch {
    failures.push(`${file}: missing`);
    continue;
  }
  for (const needle of includes) {
    if (!text.includes(needle)) {
      failures.push(`${file}: expected ${JSON.stringify(needle)}`);
    }
  }
}

if (failures.length) {
  console.error('Box P0 hotfix parity check failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log('Box P0 hotfix parity check OK.');
