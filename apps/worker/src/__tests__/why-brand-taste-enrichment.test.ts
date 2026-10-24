import { describe, it, expect } from 'vitest';
import { buildWhyBrandTasteFromContext } from '../lib/why-brand-taste-enrichment';

describe('buildWhyBrandTasteFromContext', () => {
  it('builds up to three signals and a summary', () => {
    const taste = buildWhyBrandTasteFromContext('Ulta', {
      tags: [
        { entityId: 't1', name: 'Skincare', affinity: 0.9, affinityRank: 0.88 },
        { entityId: 't2', name: 'Makeup', affinity: 0.85, affinityRank: 0.8 },
      ],
      audiences: [
        { entityId: 'a1', name: 'Beauty Shoppers', affinity: 0.92, affinityRank: 0.91 },
      ],
    });
    expect(taste?.signals).toHaveLength(3);
    expect(taste?.summary).toContain('Ulta');
  });
});
