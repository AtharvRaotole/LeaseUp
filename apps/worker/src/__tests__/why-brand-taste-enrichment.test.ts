import { describe, it, expect } from 'vitest';
import { buildWhyBrandTasteFromContext } from '../lib/why-brand-taste-enrichment';

describe('buildWhyBrandTasteFromContext', () => {
  it('builds up to three audience signals and a summary from verified overlap', () => {
    const taste = buildWhyBrandTasteFromContext('Ulta', {
      tags: [{ entityId: 't1', name: 'Tourist attraction', affinity: 0.99, affinityRank: 1 }],
      audiences: [
        { entityId: 'a1', name: 'Health And Beauty', affinity: 0.74, affinityRank: 27 },
        { entityId: 'a2', name: 'Astrology', affinity: 0.7, affinityRank: 7 },
        { entityId: 'a3', name: 'Yoga', affinity: 0.66, affinityRank: 10 },
        { entityId: 'a4', name: 'Dance', affinity: 0.6, affinityRank: 12 },
      ],
    });
    expect(taste?.signals.map((s) => s.name)).toEqual(['Health And Beauty', 'Astrology', 'Yoga']);
    expect(taste?.summary).toContain('Ulta');
    expect(taste?.summary).not.toContain('Tourist attraction');
  });

  it('omits the section when there is no verified overlap', () => {
    expect(buildWhyBrandTasteFromContext('Ulta', undefined)).toBeUndefined();
    expect(buildWhyBrandTasteFromContext('Ulta', { tags: [], audiences: [] })).toBeUndefined();
    expect(
      buildWhyBrandTasteFromContext('Ulta', {
        tags: [{ entityId: 't1', name: 'American', affinity: 0.99, affinityRank: 1 }],
        audiences: [],
      })
    ).toBeUndefined();
  });
});
