import { describe, it, expect } from 'vitest';
import {
  BLEECKER_LIKE_NON_RETAIL_TASTE,
  isNonRetailTasteName,
  pickRetailShopperTasteLabel,
  retailShopperTasteLabel,
} from '../retail-taste-tag-filter.js';
import {
  brandExplainabilityForDemo,
  listDemoExplainabilityRecordings,
} from '../brand-explainability-loader.js';
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

describe('demo chip explainability recordings (live Qloo)', () => {
  // Brands pitched on each chip that have live recordings (Ulta, Victoria's Secret, Sephora).
  const chipBrands: Array<{ chip: DemoFixtureId; entityId: string }> = [
    { chip: 'boulder', entityId: '0F77E9A4-121C-4941-ACE1-28502DBF1865' },
    { chip: 'wicker', entityId: 'D3310425-7161-41FC-8C2C-5435AF0F0A5B' },
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

  it('no recorded demo audience is a blocked non-retail theme label', () => {
    for (const rec of listDemoExplainabilityRecordings()) {
      for (const row of rec.audiences) {
        const label = retailShopperTasteLabel(row);
        if (label) {
          expect(label.toLowerCase()).not.toContain('hotel');
          expect(label.toLowerCase()).not.toContain('self help');
        }
      }
    }
  });

  it('isNonRetailTasteName blocks Bleecker-like rows and keeps recorded audiences', () => {
    for (const row of BLEECKER_LIKE_NON_RETAIL_TASTE) expect(isNonRetailTasteName(row)).toBe(true);
    expect(isNonRetailTasteName({ name: 'Health & Beauty' })).toBe(false);
    expect(isNonRetailTasteName({ name: 'Arts & Crafts' })).toBe(false);
  });
});
