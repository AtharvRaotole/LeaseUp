import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { demoSharesFromChip, type CoTenancyDemoChip } from '../lib/co-tenancy-enrich';

const manifest = JSON.parse(
  readFileSync(join(__dirname, '../../public/co-tenancy/recorded.json'), 'utf8')
) as Record<string, CoTenancyDemoChip>;

describe('co-tenancy recorded demo shares', () => {
  for (const chip of ['wicker', 'boulder', 'sevierville'] as const) {
    it(`${chip} has per-incumbent shares for each recorded pitch`, () => {
      const keys = Object.keys(manifest[chip]?.entries ?? {});
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        const rows = demoSharesFromChip(manifest[chip], key);
        expect(rows.length).toBeGreaterThanOrEqual(4);
        const total = rows.reduce((s, r) => s + r.affinity, 0);
        expect(total).toBeGreaterThan(0.9);
        expect(total).toBeLessThan(1.1);
      }
    });
  }

  it('returns no shares for unknown keys', () => {
    expect(demoSharesFromChip(manifest.wicker, 'missing:key')).toEqual([]);
    expect(demoSharesFromChip(undefined, 'missing:key')).toEqual([]);
  });
});
