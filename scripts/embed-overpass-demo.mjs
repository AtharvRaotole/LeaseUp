/**
 * Embed demo-chip Overpass recordings from data/overpass-recordings/<chip>.json only.
 * Each file MUST include { endpoint, query, recordedAt } and a real Overpass response body.
 * Synthetic test fixtures are never read here.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const recordingsDir = join(root, 'data/overpass-recordings');
const chips = ['wicker', 'boulder', 'sevierville'];

mkdirSync(recordingsDir, { recursive: true });

function parseBrandsFromElements(elements) {
  const brands = [];
  for (const el of elements || []) {
    if (!el.tags) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const brand = el.tags.brand;
    const name = el.tags.name;
    if (!brand && !name) continue;
    brands.push({
      name: name || brand,
      ...(brand ? { brand } : {}),
      ...(el.tags['brand:wikidata']
        ? { brandWikidata: el.tags['brand:wikidata'] }
        : {}),
      lat,
      lon,
    });
  }
  return brands;
}

function loadRecording(chip) {
  const path = join(recordingsDir, `${chip}.json`);
  if (!existsSync(path)) {
    return null;
  }

  const raw = JSON.parse(readFileSync(path, 'utf8'));

  if (raw._meta?.synthetic === true) {
    throw new Error(
      `${path}: synthetic recordings cannot be embedded for runtime (use __tests__ only)`
    );
  }

  const { endpoint, query, recordedAt } = raw;
  if (!endpoint || !query || !recordedAt) {
    throw new Error(
      `${path}: missing required metadata — need endpoint, query, recordedAt`
    );
  }

  const elements = raw.response?.elements ?? raw.elements;
  if (!Array.isArray(elements)) {
    throw new Error(`${path}: missing Overpass elements array`);
  }

  return {
    recordedAt,
    endpoint,
    query,
    brands: parseBrandsFromElements(elements),
  };
}

const byFixture = {};
for (const chip of chips) {
  byFixture[chip] = loadRecording(chip);
}

const out = join(root, 'packages/fixtures/src/overpass-demo.ts');
const contents = `import type { OverpassBrand } from './overpass-types';

/** Shown on demo prospects when no recorded Overpass file exists for the chip. */
export const DEMO_OSM_UNRECORDED_NOTE = 'OSM check not recorded for demo';

export interface OverpassDemoRecording {
  recordedAt: string;
  endpoint: string;
  query: string;
  brands: OverpassBrand[];
}

export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  OverpassDemoRecording | null
> = ${JSON.stringify(byFixture, null, 2)};
`;

writeFileSync(out, contents);
const recorded = chips.filter((c) => byFixture[c] !== null);
console.log(
  `Wrote overpass-demo.ts (${recorded.length}/${chips.length} chips with recordings)`
);
