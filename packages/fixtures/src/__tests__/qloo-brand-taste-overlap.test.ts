import { describe, it, expect } from 'vitest';
import {
  deterministicWhyBrandTasteSummary,
  topBrandTasteOverlapSignals,
} from '../qloo-brand-taste-overlap.js';

describe('topBrandTasteOverlapSignals', () => {
  it('returns top 3 mixed tags and audiences by score', () => {
    const signals = topBrandTasteOverlapSignals(
      {
        tags: [
          { entityId: 't1', name: 'Hiking', affinity: 0.8, affinityRank: 0.7 },
          { entityId: 't2', name: 'Camping', affinity: 0.9, affinityRank: 0.95 },
        ],
        audiences: [
          { entityId: 'a1', name: 'Outdoor Fans', affinity: 0.85, affinityRank: 0.88 },
        ],
      },
      3
    );
    expect(signals).toHaveLength(3);
    expect(signals[0]?.name).toBe('Camping');
    expect(signals.map((s) => s.kind)).toContain('audience');
  });

  it('summary uses only signal names', () => {
    const signals = topBrandTasteOverlapSignals(
      {
        tags: [{ entityId: 't1', name: 'Beauty', affinity: 0.9, affinityRank: 0.9 }],
        audiences: [],
      },
      1
    );
    const summary = deterministicWhyBrandTasteSummary('Ulta', signals);
    expect(summary).toContain('Beauty');
    expect(summary).not.toMatch(/[\u2013\u2014]/);
  });
});
