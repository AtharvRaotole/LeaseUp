/**
 * Build normalized brand-explainability/*.json from raw Qloo API bodies.
 * Raw files: packages/fixtures/src/brand-explainability/raw/<chip>-<brandId>-<kind>.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseQlooExplainabilityRows } = require('../packages/fixtures/dist/qloo-explainability.js');
const { boulderFixture } = require('../packages/fixtures/dist/boulder.js');
const { wickerparkFixture } = require('../packages/fixtures/dist/wicker-park.js');
const { seviervilleFixture } = require('../packages/fixtures/dist/sevierville.js');

const META = {
  boulder: {
    fixture: boulderFixture,
    brandEntityId: '205AF33F-118E-4C49-9721-6BDBAF981DA0',
    brandName: 'Recreational Equipment Inc',
  },
  wicker: {
    fixture: wickerparkFixture,
    brandEntityId: '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23',
    brandName: 'Whole Foods Market',
  },
  sevierville: {
    fixture: seviervilleFixture,
    brandEntityId: '2C5054E1-8691-4F52-83CD-310D029BA6A3',
    brandName: 'Sephora',
  },
};

const rawDir = join(process.cwd(), 'packages/fixtures/src/brand-explainability/raw');
const outDir = join(process.cwd(), 'packages/fixtures/src/brand-explainability');

mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

for (const [chip, meta] of Object.entries(META)) {
  const tagRawPath = join(rawDir, `${chip}-${meta.brandEntityId}-tag.json`);
  const audRawPath = join(rawDir, `${chip}-${meta.brandEntityId}-audience.json`);
  const tagRaw = JSON.parse(readFileSync(tagRawPath, 'utf8'));
  const audRaw = JSON.parse(readFileSync(audRawPath, 'utf8'));
  const recordedAt =
    tagRaw.provenance?.recordedAt ?? audRaw.provenance?.recordedAt ?? new Date().toISOString();

  const payload = {
    chip,
    brandEntityId: meta.brandEntityId,
    brandName: meta.brandName,
    location: {
      latitude: meta.fixture.location.latitude,
      longitude: meta.fixture.location.longitude,
    },
    radiusKm: 10,
    tags: parseQlooExplainabilityRows(tagRaw.body, 'tag'),
    audiences: parseQlooExplainabilityRows(audRaw.body, 'audience'),
    provenance: {
      recordedAt,
      host: tagRaw.provenance?.host ?? 'https://hackathon.api.qloo.com',
      note: 'Normalized from raw/*.json via scripts/materialize-explainability-fixtures.mjs',
    },
  };

  const outPath = join(outDir, `${chip}-${meta.brandEntityId}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote', outPath, 'tags', payload.tags.length, 'audiences', payload.audiences.length);
}
