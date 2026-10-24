import { describe, it, expect } from 'vitest';
import { distinctPitchAudienceLists } from '../distinct-pitch-audiences.js';
import { brandExplainabilityForDemo } from '../brand-explainability-loader.js';
import chipBrands from '../brand-explainability/chip-brands.json';

const TJ_MAXX = 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6';
const OLD_NAVY = '81EC4A41-53FB-47FD-995A-B8AE3EE90652';
const HOBBY_LOBBY = '423EDCAF-1289-474E-9982-0CC39A5BAEFE';

describe('distinctPitchAudienceLists', () => {
  it('assigns distinct primary entityIds when lift-ordered pools allow it', () => {
    const pools = [
      [
        { entityId: 'a', name: 'A', affinity: 0.8, affinityRank: 1 },
        { entityId: 'b', name: 'B', affinity: 0.7, affinityRank: 2 },
      ],
      [
        { entityId: 'a', name: 'A', affinity: 0.75, affinityRank: 1 },
        { entityId: 'c', name: 'C', affinity: 0.74, affinityRank: 3 },
      ],
    ];
    const trimmed = distinctPitchAudienceLists(pools);
    expect(trimmed[0]![0]!.entityId).toBe('a');
    expect(trimmed[1]![0]!.entityId).toBe('c');
  });

  it('repeats the top row only when no unused candidate remains', () => {
    const row = { entityId: 'only', name: 'Only', affinity: 0.9, affinityRank: 1 };
    const trimmed = distinctPitchAudienceLists([[row], [row]]);
    expect(trimmed[0]![0]).toEqual(row);
    expect(trimmed[1]![0]).toEqual(row);
  });
});

describe('Boulder pitch list primary audiences', () => {
  it('does not give TJ Maxx, Old Navy, and Hobby Lobby the same primary audience when alternatives pass', () => {
    const ids = [TJ_MAXX, OLD_NAVY, HOBBY_LOBBY];
    const pools = ids.map((id) =>
      brandExplainabilityForDemo('boulder', id, { maxAudiences: 12 })!.audiences
    );
    expect(pools.every((p) => p.length > 0)).toBe(true);
    const primaries = distinctPitchAudienceLists(pools).map((rows) => rows[0]!.name);
    const unique = new Set(primaries);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('covers every recorded Boulder chip brand with at most two shown audiences after trim', () => {
    const ids = chipBrands.boulder as string[];
    const pools = ids.map(
      (id) => brandExplainabilityForDemo('boulder', id, { maxAudiences: 12 })?.audiences ?? []
    );
    const trimmed = distinctPitchAudienceLists(pools);
    expect(trimmed.length).toBe(ids.length);
    for (const rows of trimmed) {
      expect(rows.length).toBeLessThanOrEqual(2);
    }
  });
});
