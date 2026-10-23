/**
 * Build demo fixtures from recorded Qloo validation data.
 * Usage:
 *   node scripts/build-fixtures.mjs \
 *     --neigh-test data/research/round2/neigh_test_10km.json \
 *     --brands data/research/round2/brands_all.json \
 *     --stores packages/fixtures/src/store-locations.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function parseArgs(argv) {
  const args = {
    neighTest: 'data/research/round2/neigh_test_10km.json',
    brands: 'data/research/round2/brands_all.json',
    stores: 'packages/fixtures/src/store-locations.json',
  };

  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--neigh-test' && value) {
      args.neighTest = value;
      i++;
    } else if (flag === '--brands' && value) {
      args.brands = value;
      i++;
    } else if (flag === '--stores' && value) {
      args.stores = value;
      i++;
    }
  }

  return args;
}

const paths = parseArgs(process.argv);
const { computeBacktest } = await import('../packages/fixtures/dist/backtest.js');

const neighTest = JSON.parse(readFileSync(paths.neighTest, 'utf8'));
const brands = JSON.parse(readFileSync(paths.brands, 'utf8'));
const storeData = JSON.parse(readFileSync(paths.stores, 'utf8'));

const brandsByName = {};
for (const info of Object.values(brands)) {
  brandsByName[info.name] = info;
}

function getBrandId(name) {
  return brandsByName[name]?.id || null;
}

const neighborhoods = ['Wicker Park, Chicago', 'Boulder, Colorado', 'Sevierville, Tennessee'];

for (const neighName of neighborhoods) {
  const neighData = neighTest.rows.find((r) => r.n === neighName);
  if (!neighData) {
    console.warn(`${neighName} not found in test data`);
    continue;
  }

  const rawBrands = neighTest.raw[neighName] || [];
  if (rawBrands.length === 0) {
    console.warn(`${neighName} has no raw Qloo data`);
    continue;
  }

  const latitude = neighName.includes('Wicker')
    ? 41.9088
    : neighName.includes('Boulder')
      ? 40.015
      : 35.8681;
  const longitude = neighName.includes('Wicker')
    ? -87.6776
    : neighName.includes('Boulder')
      ? -105.2705
      : -83.5618;

  const insights = rawBrands
    .map(([name, affinity]) => {
      const brandId = getBrandId(name);
      return {
        entity_id: brandId,
        name,
        affinity,
        affinity_rank: affinity,
      };
    })
    .filter((b) => b.entity_id !== null);

  const backtest = computeBacktest(insights, latitude, longitude, neighTest.radius_km);

  const fixture = {
    location: {
      name: neighName,
      latitude,
      longitude,
    },
    insights,
    backtest: {
      totalStores: backtest.totalStores,
      auc: backtest.auc,
      precisionAt10: backtest.precisionAt10,
      presentInTop10: backtest.presentInTop10,
      radius_km: neighTest.radius_km,
    },
  };

  const filename = neighName
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\s+/g, '-');

  const outputPath = join(process.cwd(), `packages/fixtures/src/${filename}.ts`);
  const exportName = `${filename.replace(/-/g, '')}Fixture`;

  const tsContent = `/**
 * Recorded Qloo validation data for ${neighName}
 * Source: ${paths.neighTest}
 * Backtest computed by packages/fixtures computeBacktest()
 * Generated: ${new Date().toISOString()}
 */

export const ${exportName} = ${JSON.stringify(fixture, null, 2)};
`;

  writeFileSync(outputPath, tsContent);
  console.log(
    `Created ${filename}.ts: ${fixture.insights.length} brands, AUC ${backtest.auc.toFixed(3)}, P@10 ${backtest.precisionAt10}`
  );
}

console.log('\nDone! Run "pnpm --filter @leaseup/fixtures build" to compile.');
