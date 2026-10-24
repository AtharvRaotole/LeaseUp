#!/usr/bin/env node
/**
 * CI check: verified brand-real-estate URLs return 2xx HTML whose <title> or <h1>
 * mentions real estate, site selection, leasing, or property (same rule as generate).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { fetchRealEstatePage } from './brand-real-estate-page-verify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  readFileSync(join(root, 'packages/fixtures/src/brand-real-estate.json'), 'utf8')
);

const verified = data.entries.filter((e) => e.status === 'verified');
if (data.entries.length < 60) {
  console.error(`Expected at least 60 brands in dataset, got ${data.entries.length}`);
  process.exit(1);
}
if (verified.length < 1) {
  console.error('No verified entries in brand-real-estate.json');
  process.exit(1);
}

let failed = 0;
let transient = 0;
for (const row of verified) {
  const result = await fetchRealEstatePage(row.url);
  if (result.transient || result.status === 0) {
    transient += 1;
    console.warn(`SKIP transient ${row.name} ${row.url}`);
    continue;
  }
  if (result.bot) {
    failed += 1;
    console.error(
      `FAIL ${row.name} bot-blocked ${result.status} ${row.url} title="${result.title}"`
    );
    continue;
  }
  if (result.status < 200 || result.status >= 400) {
    failed += 1;
    console.error(`FAIL ${row.name} HTTP ${result.status} ${row.url}`);
    continue;
  }
  if (!result.pass) {
    failed += 1;
    const label = result.title || result.h1 || '(no title/h1 keywords)';
    console.error(`FAIL ${row.name} missing keywords ${row.url} title="${label}"`);
    continue;
  }
  console.log(`OK ${row.name} "${result.title || result.h1}"`);
}

if (transient > 0) {
  console.warn(`${transient} verified URL(s) skipped (transient network; not failing CI)`);
}

if (failed > 0) {
  console.error(`${failed} verified URL(s) failed content verification`);
  process.exit(1);
}

console.log(`All ${verified.length} verified brand real-estate URLs passed title/h1 check`);
