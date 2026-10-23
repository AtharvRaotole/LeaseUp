/**
 * Embed demo-chip Overpass brand lists from recorded/synthetic fixture JSON.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const fixturesDir = join(root, 'apps/worker/src/__tests__/fixtures');

function parseBrands(fixturePath) {
  const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const brands = [];
  for (const el of data.elements || []) {
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

const byFixture = {
  wicker: parseBrands(join(fixturesDir, 'overpass-wicker-park-synthetic.json')),
  boulder: parseBrands(join(fixturesDir, 'overpass-boulder-synthetic.json')),
  sevierville: parseBrands(join(fixturesDir, 'overpass-sevierville-synthetic.json')),
};

const out = join(root, 'packages/fixtures/src/overpass-demo.ts');
const contents = `import type { OverpassBrand } from './overpass-types';

/**
 * OSM hits near demo chips for batched prospect verification.
 * Source: apps/worker/src/__tests__/fixtures/overpass-*-synthetic.json
 * (Replace with live Overpass recordings when public endpoints are reachable.)
 */
export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  { brands: OverpassBrand[] }
> = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(byFixture).map(([k, brands]) => [k, { brands }])
  ),
  null,
  2
)};
`;

writeFileSync(out, contents);
console.log('Wrote overpass-demo.ts', byFixture);
