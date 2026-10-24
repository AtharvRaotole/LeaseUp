#!/usr/bin/env node
/**
 * Regenerate landing hero preview from demo analyze (same path as live Wicker report).
 *
 *   pnpm --filter @leaseup/fixtures build
 *   EXPORT_LANDING_WICKER_PREVIEW=1 pnpm --filter @leaseup/worker exec vitest run src/__tests__/landing-wicker-preview-export.test.ts
 *
 * Writes apps/web/src/data/landing-wicker-preview.ts and
 * packages/fixtures/src/wicker-landing-prospect-order.json
 */
import { execSync } from 'node:child_process';

execSync('pnpm --filter @leaseup/fixtures build', { stdio: 'inherit' });

execSync(
  'pnpm --filter @leaseup/worker exec vitest run src/__tests__/landing-wicker-preview-export.test.ts',
  {
    stdio: 'inherit',
    env: { ...process.env, EXPORT_LANDING_WICKER_PREVIEW: '1' },
  }
);

console.log('Landing Wicker preview regenerated.');
