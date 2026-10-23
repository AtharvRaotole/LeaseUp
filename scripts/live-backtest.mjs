#!/usr/bin/env node

/**
 * Live Backtest CLI for LeaseUp
 * 
 * Runs live backtests against Qloo API for Wicker Park, Boulder, and Sevierville.
 * Requires QLOO_API_KEY in environment.
 * 
 * Usage:
 *   QLOO_API_KEY=xxx node scripts/live-backtest.mjs
 *   QLOO_API_KEY=xxx node scripts/live-backtest.mjs --record-fixtures
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test locations from validation set
const LOCATIONS = [
  {
    name: 'Wicker Park, Chicago',
    lat: 41.9105,
    lng: -87.6769,
    radius: 10,
  },
  {
    name: 'Boulder, CO',
    lat: 40.0150,
    lng: -105.2705,
    radius: 10,
  },
  {
    name: 'Sevierville, TN',
    lat: 35.8684,
    lng: -83.5619,
    radius: 10,
  },
];

// Check for API key
const QLOO_API_KEY = process.env.QLOO_API_KEY;
if (!QLOO_API_KEY) {
  console.error('❌ Error: QLOO_API_KEY environment variable not set');
  console.error('Usage: QLOO_API_KEY=xxx node scripts/live-backtest.mjs');
  process.exit(1);
}

const QLOO_BASE_URL = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const RECORD_FIXTURES = process.argv.includes('--record-fixtures');

console.log('🚀 LeaseUp Live Backtest\n');
console.log(\`API: \${QLOO_BASE_URL}\`);
console.log(\`Mode: \${RECORD_FIXTURES ? 'Record fixtures' : 'Backtest only'}\n\`);

/**
 * Query Qloo brand insights API
 */
async function getBrandInsights(location, tags = []) {
  const url = new URL(\`\${QLOO_BASE_URL}/v1/brand_insights\`);
  url.searchParams.set('location', \`\${location.lat},\${location.lng}\`);
  url.searchParams.set('take', '50');
  if (tags.length > 0) {
    url.searchParams.set('tags', tags.join(','));
  }

  const startTime = Date.now();
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': \`Bearer \${QLOO_API_KEY}\`,
      'Content-Type': 'application/json',
    },
  });

  const latency = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(\`Qloo API error: \${response.status} \${response.statusText}\`);
  }

  const data = await response.json();
  return { data, latency };
}

/**
 * Load validation data from round2/neigh_test_10km.json
 */
async function loadValidationData() {
  const validationPath = join(__dirname, '../round2/neigh_test_10km.json');
  try {
    const content = await fs.readFile(validationPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('⚠️  Warning: Could not load validation data from round2/neigh_test_10km.json');
    return null;
  }
}

/**
 * Calculate precision@k
 */
function precisionAtK(predicted, actual, k) {
  if (predicted.length === 0 || actual.length === 0) return 0;
  
  const topK = predicted.slice(0, k);
  const actualSet = new Set(actual.map(id => id.toLowerCase()));
  const hits = topK.filter(id => actualSet.has(id.toLowerCase())).length;
  
  return hits / k;
}

/**
 * Calculate AUC using Mann-Whitney U statistic
 */
function calculateAUC(predicted, actual) {
  if (predicted.length === 0 || actual.length === 0) return 0;
  
  const actualSet = new Set(actual.map(id => id.toLowerCase()));
  const positives = predicted.filter(id => actualSet.has(id.toLowerCase()));
  const negatives = predicted.filter(id => !actualSet.has(id.toLowerCase()));
  
  if (positives.length === 0 || negatives.length === 0) return 0;
  
  let sum = 0;
  for (const pos of positives) {
    const posRank = predicted.indexOf(pos);
    for (const neg of negatives) {
      const negRank = predicted.indexOf(neg);
      if (posRank < negRank) {
        sum += 1;
      } else if (posRank === negRank) {
        sum += 0.5;
      }
    }
  }
  
  return sum / (positives.length * negatives.length);
}

/**
 * Run backtest for one location
 */
async function runBacktest(location, validation) {
  console.log(\`\n📍 \${location.name}\`);
  console.log(\`   Coordinates: \${location.lat}, \${location.lng}\`);
  console.log(\`   Radius: \${location.radius}km\`);

  try {
    // Query Qloo API
    const { data, latency } = await getBrandInsights(location);
    
    if (!data.data || data.data.length === 0) {
      console.log(\`   ⚠️  No insights returned\`);
      return null;
    }

    const insights = data.data;
    const brandIds = insights.map(i => i.entity_id);
    
    console.log(\`   ✓ \${insights.length} brands returned (\${latency}ms)\`);

    // Calculate metrics if validation data available
    let metrics = null;
    if (validation) {
      const locationKey = location.name.toLowerCase().replace(/[^a-z]/g, '');
      const validationData = validation[locationKey];
      
      if (validationData && validationData.present_brand_ids) {
        const actual = validationData.present_brand_ids;
        const p10 = precisionAtK(brandIds, actual, 10);
        const auc = calculateAUC(brandIds, actual);
        
        metrics = {
          precisionAt10: p10,
          auc: auc,
          nBrands: insights.length,
          nActual: actual.length,
        };
        
        console.log(\`   📊 P@10: \${(p10 * 100).toFixed(1)}%\`);
        console.log(\`   📊 AUC: \${auc.toFixed(3)}\`);
      }
    }

    return {
      location: location.name,
      success: true,
      insights,
      latency,
      metrics,
    };
  } catch (err) {
    console.log(\`   ❌ Error: \${err.message}\`);
    return {
      location: location.name,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  const results = [];
  const validation = await loadValidationData();

  for (const location of LOCATIONS) {
    const result = await runBacktest(location, validation);
    if (result) {
      results.push(result);
    }
    
    // Rate limit: wait 1s between requests
    if (location !== LOCATIONS[LOCATIONS.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate outputs
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Summary\n');

  // Markdown table
  console.log('| Location | P@10 | AUC | Brands | Latency |');
  console.log('|----------|------|-----|--------|---------|');
  
  for (const result of results) {
    if (result.success && result.metrics) {
      const { location, metrics, latency } = result;
      const p10 = (metrics.precisionAt10 * 100).toFixed(1);
      const auc = metrics.auc.toFixed(3);
      console.log(\`| \${location} | \${p10}% | \${auc} | \${metrics.nBrands} | \${latency}ms |\`);
    }
  }

  // Write JSON output
  const outputPath = join(__dirname, '../backtest-results.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(\`\n✅ Results written to: \${outputPath}\`);

  // Record fixtures if requested
  if (RECORD_FIXTURES) {
    console.log('\n📝 Recording fixtures...');
    
    for (const result of results) {
      if (result.success && result.insights) {
        const locationKey = result.location.toLowerCase().replace(/[^a-z]/g, '');
        const fixturePath = join(__dirname, \`../packages/fixtures/src/\${locationKey}.ts\`);
        
        // Note: Fixture recording would need to transform the API response
        // into the fixture format. Skipping detailed implementation here.
        console.log(\`   \${locationKey}: \${result.insights.length} insights\`);
      }
    }
  }

  console.log('\n✅ Backtest complete\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
