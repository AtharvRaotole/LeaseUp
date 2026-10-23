#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const expanded = JSON.parse(readFileSync(join(root, 'data/brands/brands_expanded.json'), 'utf8'));

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/cost plus world market|world market/.test(n)) {
    return 'Home';
  }
  if (/grocery|foods|market|restaurant|pizza|burger|taco|coffee|starbucks|chipotle|panera|subway|wendy|mcdonald|dunkin|whole foods|trader joe|aldi|kroger|safeway|publix|heb|food/.test(n)) {
    return 'Food & drink';
  }
  if (/sephora|ulta|beauty|cosmetic|salon|lush|bath & body|mac /.test(n)) {
    return 'Beauty';
  }
  if (/nike|adidas|lululemon|gap|zara|apparel|outfitters|fashion|foot locker|vans|under armour|aerie|kohl|nordstrom|macy|j\.crew|ann taylor|old navy|hollister|abercrombie|rei\b|sport/.test(n)) {
    return 'Apparel';
  }
  if (/home|furniture|pottery barn|williams.?sonoma|bed bath|crate|ikea|lowe|home depot|menards|world market/.test(n)) {
    return 'Home';
  }
  if (/gym|fitness|planet fitness|solidcore|equinox|orangetheory/.test(n)) {
    return 'Fitness';
  }
  return 'Retail';
}

const byId = {};
for (const row of Object.values(expanded)) {
  byId[row.id.toUpperCase()] = guessCategory(row.name);
}

const body = `/** Auto-generated */\nexport const BRAND_CATEGORY_BY_ID: Record<string, string> = ${JSON.stringify(byId, null, 2)};\n`;
const workerOut = join(root, 'apps/worker/src/data/brand-category-map.ts');
const webOut = join(root, 'apps/web/src/data/brand-category-map.ts');
writeFileSync(workerOut, body);
writeFileSync(webOut, body);
console.log('Wrote', workerOut);
console.log('Wrote', webOut);
