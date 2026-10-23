import { describe, expect, it } from 'vitest';
import {
  parseQlooTradeAreaTagInsights,
  WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE,
} from '../qloo-trade-area-tag-insights.js';

describe('parseQlooTradeAreaTagInsights', () => {
  it('parses the live Wicker Park tag insights sample', () => {
    const parsed = parseQlooTradeAreaTagInsights(WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE);
    expect(parsed).not.toBeNull();
    expect(parsed!.qlooFields).toContain('results.tags[].query.affinity');
    expect(parsed!.groups).toHaveLength(2);

    const who = parsed!.groups.find((g) => g.id === 'customer_identity');
    expect(who?.label).toBe('Who shops here');
    expect(who?.names).toEqual([
      'Beer Enthusiasts',
      'Cocktail Enthusiasts',
      'Foodies',
      'Regulars',
    ]);

    const vibe = parsed!.groups.find((g) => g.id === 'ambience');
    expect(vibe?.label).toBe('Vibe');
    expect(vibe?.names).toEqual(['Social']);
  });

  it('returns null when tags are missing', () => {
    expect(parseQlooTradeAreaTagInsights({ results: {} })).toBeNull();
  });
});
