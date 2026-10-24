import { describe, it, expect } from 'vitest';
import { coTenancyRecordedKeys, coTenancyRecordedRaw } from '@leaseup/fixtures/worker';
import { parseCoAffinityFromInsights } from '../lib/co-tenancy-pairing';

type Body = {
  results?: {
    entities?: Array<{
      query?: { explainability?: Record<string, Array<{ entity_id?: string }>> };
    }>;
  };
};

describe('co-tenancy recorded fixtures', () => {
  for (const chip of ['wicker', 'boulder', 'sevierville'] as const) {
    it(`${chip} expands to bodies with per-incumbent shares`, () => {
      const keys = coTenancyRecordedKeys(chip);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        const pitch = key.split(':')[0] ?? '';
        const body = coTenancyRecordedRaw(chip, key) as Body | null;
        expect(body).not.toBeNull();
        const ids = (
          body?.results?.entities?.[0]?.query?.explainability?.['signal.interests.entities'] ?? []
        ).map((e) => String(e.entity_id));
        const rows = parseCoAffinityFromInsights(body, ids, pitch);
        expect(rows.length).toBeGreaterThanOrEqual(4);
      }
    });
  }

  it('returns null for unknown keys and non-chip demos', () => {
    expect(coTenancyRecordedRaw('wicker', 'missing:key')).toBeNull();
  });
});
