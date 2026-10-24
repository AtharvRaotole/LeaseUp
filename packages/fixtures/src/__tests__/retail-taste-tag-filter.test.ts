import { describe, it, expect } from 'vitest';
import {
  BLEECKER_LIKE_NON_RETAIL_TASTE,
  pickRetailShopperTasteLabel,
  retailShopperTasteLabel,
} from '../retail-taste-tag-filter.js';
import { brandExplainabilityForDemo } from '../brand-explainability-loader.js';
import type { DemoFixtureId } from '../demo-addresses.js';

describe('retailShopperTasteLabel', () => {
  it('drops Bleecker-like non-retail Qloo tag names', () => {
    expect(pickRetailShopperTasteLabel(BLEECKER_LIKE_NON_RETAIL_TASTE, [])).toBeNull();
    for (const row of BLEECKER_LIKE_NON_RETAIL_TASTE) {
      expect(retailShopperTasteLabel(row)).toBeNull();
    }
  });

  it('maps clear retail tags to shopper-friendly labels', () => {
    expect(
      retailShopperTasteLabel({
        entityId: 'tag-organic-food',
        name: 'Organic Food',
        affinity: 0.9,
        affinityRank: 0.9,
      })
    ).toBe('organic grocery');
    expect(
      retailShopperTasteLabel({
        entityId: 't1',
        name: 'Streetwear',
        affinity: 0.8,
        affinityRank: 1,
      })
    ).toBe('streetwear');
  });
});

describe('demo chip explainability recordings', () => {
  const chipBrands: Array<{ chip: DemoFixtureId; entityId: string }> = [
    { chip: 'boulder', entityId: '205AF33F-118E-4C49-9721-6BDBAF981DA0' },
    { chip: 'wicker', entityId: '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23' },
    { chip: 'sevierville', entityId: '2C5054E1-8691-4F52-83CD-310D029BA6A3' },
  ];

  for (const { chip, entityId } of chipBrands) {
    it(`${chip}: pitch-row taste label is retail-relevant when present`, () => {
      const rec = brandExplainabilityForDemo(chip, entityId);
      expect(rec).not.toBeNull();
      const label = pickRetailShopperTasteLabel(rec!.tags, rec!.audiences);
      expect(label).not.toBeNull();
      expect(label!.toLowerCase()).not.toContain('hotel');
      expect(label!.toLowerCase()).not.toContain('self help');
    });
  }
});
