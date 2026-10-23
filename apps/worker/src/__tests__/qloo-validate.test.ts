import { describe, it, expect } from 'vitest';
import { assertQlooInsightsValid } from '../providers/qloo-validate';

describe('assertQlooInsightsValid', () => {
  it('throws when all affinities are zero', () => {
    expect(() =>
      assertQlooInsightsValid([
        { entity_id: 'a', name: 'A', query: { affinity: 0 } },
        { entity_id: 'b', name: 'B', query: { affinity: 0 } },
      ])
    ).toThrow(/unusable/i);
  });

  it('throws when results mirror input order with zero affinity', () => {
    const ids = ['a', 'b'];
    expect(() =>
      assertQlooInsightsValid(
        [
          { entity_id: 'a', name: 'A', query: { affinity: 0 } },
          { entity_id: 'b', name: 'B', query: { affinity: 0 } },
        ],
        ids
      )
    ).toThrow();
  });
});
