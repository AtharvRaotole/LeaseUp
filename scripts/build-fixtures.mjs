/**
 * Build demo fixtures from real Qloo validation data
 * Source: round2/neigh_test_10km.json (actual API responses)
 * Run: cd /workspace && node scripts/build-fixtures.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const NEIGH_TEST_FILE = '/home/ubuntu/.cursor/projects/workspace/uploads/round2/neigh_test_10km.json';
const BRANDS_FILE = '/home/ubuntu/.cursor/projects/workspace/uploads/round2/brands_all.json';
const STORE_DATA_FILE = 'packages/fixtures/src/store-locations.json';

const neighTest = JSON.parse(readFileSync(NEIGH_TEST_FILE, 'utf8'));
const brands = JSON.parse(readFileSync(BRANDS_FILE, 'utf8'));
const storeData = JSON.parse(readFileSync(STORE_DATA_FILE, 'utf8'));

// Build reverse lookup: brand name -> brand data
const brandsByName = {};
for (const [slug, info] of Object.entries(brands)) {
  brandsByName[info.name] = { ...info, slug };
}

// Helper to get brand ID from name
function getBrandId(name) {
  const brandInfo = brandsByName[name];
  return brandInfo?.id || null;
}

// Build fixtures for validated neighborhoods
const neighborhoods = ['Wicker Park, Chicago', 'Boulder, Colorado', 'Sevierville, Tennessee'];

for (const neighName of neighborhoods) {
  const neighData = neighTest.rows.find(r => r.n === neighName);
  if (!neighData) {
    console.warn(`${neighName} not found in test data`);
    continue;
  }
  
  const rawBrands = neighTest.raw[neighName] || [];
  if (rawBrands.length === 0) {
    console.warn(`${neighName} has no raw Qloo data`);
    continue;
  }

  const fixture = {
    location: {
      name: neighName,
      // Coords from validation test
      latitude: neighName.includes('Wicker') ? 41.9088 :
                neighName.includes('Boulder') ? 40.0150 : 35.8681,
      longitude: neighName.includes('Wicker') ? -87.6776 :
                 neighName.includes('Boulder') ? -105.2705 : -83.5618,
    },
    
    insights: rawBrands.map(([name, affinity]) => {
      const brandId = getBrandId(name);
      return {
        entity_id: brandId,
        name: name,
        affinity: affinity,
        affinity_rank: affinity, // In real Qloo data these are similar
      };
    }).filter(b => b.entity_id !== null), // Only include brands we have IDs for
    
    backtest: {
      totalStores: neighData.present,
      auc: neighData.auc_qloo,
      precisionAt10: neighData.p10,
      radius_km: neighTest.radius_km,
    },
  };

  const filename = neighName.toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\s+/g, '-');
  
  const outputPath = join(process.cwd(), `packages/fixtures/src/${filename}.ts`);
  
  const tsContent = `/**
 * Real Qloo validation data for ${neighName}
 * Source: round2/neigh_test_10km.json
 * AUC: ${neighData.auc_qloo.toFixed(3)}, P@10: ${neighData.p10}, Radius: ${neighTest.radius_km}km
 * Generated: ${new Date().toISOString()}
 */

export const ${filename.replace(/-/g, '')}Fixture = ${JSON.stringify(fixture, null, 2)};
`;
  
  writeFileSync(outputPath, tsContent);
  console.log(`Created ${filename}.ts: ${fixture.insights.length} brands, AUC ${neighData.auc_qloo.toFixed(3)}, P@10 ${neighData.p10}`);
}

console.log('\nDone! Run "pnpm --filter @leaseup/fixtures build" to compile.');
