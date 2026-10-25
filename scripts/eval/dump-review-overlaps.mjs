#!/usr/bin/env node
/**
 * Dump verified local audience overlap counts (the review guardrail input) for the three recorded
 * chips x 19 recorded brands, using the shipped overlap code. Run after building @leaseup/fixtures.
 * Output: data/qloo-eval-40/review_lift_overlaps.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createBrandExplainabilityStore} from '../../packages/fixtures/dist/brand-explainability-store.js';
const compact = JSON.parse(readFileSync('apps/worker/public/brand-explainability/live-audiences.compact.json','utf8'));
const store = createBrandExplainabilityStore(compact);
const MAXS = 2; // BRAND_AUDIENCE_MAX_SHOWN
 const out = {};
for (const chip of Object.keys(compact.locals)) {
  out[chip] = {};
  for (const [id, b] of Object.entries(compact.brands)) {
    const r = store.brandExplainabilityForDemo(chip, id, { maxAudiences: MAXS });
    out[chip][id] = { name: b.name, audiences: r ? r.audiences.length : null };
  }
}
writeFileSync('data/qloo-eval-40/review_lift_overlaps.json', JSON.stringify(out, null, 1) + '\n');
console.log('wrote data/qloo-eval-40/review_lift_overlaps.json');
