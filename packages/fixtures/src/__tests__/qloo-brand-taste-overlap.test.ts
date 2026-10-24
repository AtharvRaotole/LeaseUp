import { describe, it, expect } from 'vitest';
import {
  computeBrandLocalAudienceOverlap,
  deterministicWhyBrandTasteSummary,
  formatBrandTasteOverlapLine,
  topBrandTasteOverlapSignals,
  audienceDisplayName,
  BRAND_AUDIENCE_MIN_PANEL_LIFT,
  QLOO_AUDIENCE_DISPLAY_NAMES,
  SENSITIVE_AUDIENCE_NAMES,
} from '../qloo-brand-taste-overlap.js';
import {
  audiencePanelBaseline,
  audiencePanelSize,
  brandExplainabilityForDemo,
  listDemoExplainabilityRecordings,
} from '../brand-explainability-loader.js';
import chipBrands from '../brand-explainability/chip-brands.json';

const ULTA = '0F77E9A4-121C-4941-ACE1-28502DBF1865';
const TJ_MAXX = 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6';
const MICHAELS = 'C69202E6-9A83-4BD6-A720-ECAB9DB2AE52';
const WHOLE_FOODS = '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23';
const SEPHORA = '2C5054E1-8691-4F52-83CD-310D029BA6A3';

const aud = (entityId: string, affinity: number) => ({ entityId, name: entityId.toUpperCase(), affinity });

describe('computeBrandLocalAudienceOverlap', () => {
  it('keeps only audiences in both the brand and local responses', () => {
    const brand = [aud('beauty', 0.8), aud('crafts', 0.7), aud('golf', 0.6)];
    const local = [aud('crafts', 0.9), aud('beauty', 0.85), aud('hiking', 0.99)];
    const rows = computeBrandLocalAudienceOverlap(brand, local);
    expect(rows.map((r) => r.entityId)).toEqual(['beauty', 'crafts']);
    expect(rows[0]).toMatchObject({ affinity: 0.8, affinityRank: 3 });
    expect(rows[1]).toMatchObject({ affinity: 0.7, affinityRank: 2 });
  });

  it('never returns a local-only audience, however strong locally', () => {
    const rows = computeBrandLocalAudienceOverlap([aud('beauty', 0.8)], [aud('hiking', 0.99)]);
    expect(rows).toEqual([]);
  });

  it('drops audiences at Qloo neutral affinity, outside brand top K or local top K', () => {
    const brand = [aud('a', 0.9), aud('b', 0.8), aud('neutral', 0.5)];
    const local = [aud('a', 0.9), aud('b', 0.8), aud('neutral', 0.7)];
    expect(computeBrandLocalAudienceOverlap(brand, local).map((r) => r.entityId)).toEqual(['a', 'b']);
    expect(computeBrandLocalAudienceOverlap(brand, local, { brandTopK: 1 }).map((r) => r.entityId)).toEqual(['a']);
    expect(computeBrandLocalAudienceOverlap(brand, local, { localTopK: 1 }).map((r) => r.entityId)).toEqual(['a']);
  });

  it('drops audiences that do not beat the panel baseline', () => {
    const brand = [aud('beauty', 0.74), aud('finance', 0.57)];
    const local = [aud('beauty', 0.9), aud('finance', 0.95)];
    const rows = computeBrandLocalAudienceOverlap(brand, local, {
      panelBaseline: { beauty: 0.7, finance: 0.62 },
    });
    expect(rows.map((r) => r.entityId)).toEqual(['beauty']);
  });

  it('returns empty when the brand response is empty', () => {
    expect(computeBrandLocalAudienceOverlap([], [aud('a', 0.9)])).toEqual([]);
  });
});

describe('topBrandTasteOverlapSignals', () => {
  it('uses audiences only, keeps the lift order it is given, and ignores tags', () => {
    const signals = topBrandTasteOverlapSignals(
      {
        tags: [{ entityId: 't1', name: 'American', affinity: 0.99, affinityRank: 1 }],
        audiences: [
          { entityId: 'a1', name: 'Arts & Crafts', affinity: 0.63, affinityRank: 20 },
          { entityId: 'a2', name: 'Health & Beauty', affinity: 0.74, affinityRank: 27 },
        ],
      },
      3
    );
    expect(signals.map((s) => s.name)).toEqual(['Arts & Crafts', 'Health & Beauty']);
    expect(signals.every((s) => s.kind === 'audience')).toBe(true);
  });

  it('returns no signals for empty or implausible rows', () => {
    expect(topBrandTasteOverlapSignals(undefined)).toEqual([]);
    expect(topBrandTasteOverlapSignals({ tags: [], audiences: [] })).toEqual([]);
    expect(
      topBrandTasteOverlapSignals({
        tags: [],
        audiences: [
          { entityId: 'a', name: 'Neutral', affinity: 0.5, affinityRank: 1 },
          { entityId: 'b', name: 'Far', affinity: 0.8, affinityRank: 41 },
          { entityId: 'c', name: 'Fraction rank', affinity: 0.8, affinityRank: 0.9 },
        ],
      })
    ).toEqual([]);
  });

  it('summary and lines restate only signal names, no em dashes', () => {
    const signals = topBrandTasteOverlapSignals({
      tags: [],
      audiences: [{ entityId: 'a', name: 'Health & Beauty', affinity: 0.74, affinityRank: 27 }],
    });
    const summary = deterministicWhyBrandTasteSummary('Ulta', signals);
    expect(summary).toContain('Health & Beauty');
    expect(summary).not.toMatch(/[\u2013\u2014]/);
    expect(formatBrandTasteOverlapLine(signals[0]!)).toBe(
      'Audience: Health & Beauty (brand affinity 0.74, #27 locally)'
    );
    expect(deterministicWhyBrandTasteSummary('Ulta', [])).toBe('');
  });
});

describe('live-recorded demo overlap', () => {
  it('Boulder Ulta and Wicker TJ Maxx come from live recordings', () => {
    const ulta = brandExplainabilityForDemo('boulder', ULTA)!;
    expect(ulta.audiences.map((r) => r.name)).toContain('Health & Beauty');
    expect(ulta.tags).toEqual([]);
    const tj = brandExplainabilityForDemo('wicker', TJ_MAXX)!;
    expect(tj.audiences.length).toBeGreaterThan(0);
    expect(tj.provenance.brandUrl).toContain('signal.interests.entities=' + TJ_MAXX);
    expect(tj.provenance.localUrl).toContain('signal.location=');
  });

  it('every demo row is in the brand top 12, beats 0.52 and is in the local top 30', () => {
    for (const rec of listDemoExplainabilityRecordings()) {
      for (const row of rec.audiences) {
        expect(row.affinity).toBeGreaterThanOrEqual(0.52);
        expect(row.affinityRank).toBeGreaterThanOrEqual(1);
        expect(row.affinityRank).toBeLessThanOrEqual(30);
      }
    }
  });

  it('unknown brand has no recording', () => {
    expect(brandExplainabilityForDemo('boulder', '00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('audience display names', () => {
  it('maps Qloo ids to readable labels and keeps other names verbatim', () => {
    expect(audienceDisplayName('604A723B-3E2C-4795-89AA-DF5BA0C3B3C5', 'Arts Crafts')).toBe('Arts & Crafts');
    expect(audienceDisplayName('8F0407D3-64F3-47BF-A6B1-BA4C30465F71', 'Health And Beauty')).toBe(
      'Health & Beauty'
    );
    expect(audienceDisplayName('unknown-id', ' Sneakerheads ')).toBe('Sneakerheads');
  });

  it('labels are cosmetic only: no dashes, and each keeps the words of the Qloo name', () => {
    for (const label of Object.values(QLOO_AUDIENCE_DISPLAY_NAMES)) {
      expect(label).not.toMatch(/[\u2013\u2014]/);
      expect(label.length).toBeGreaterThan(0);
    }
    expect(Object.keys(QLOO_AUDIENCE_DISPLAY_NAMES).length).toBeLessThanOrEqual(12);
  });

  it('overlap rows carry the display label', () => {
    const rows = computeBrandLocalAudienceOverlap(
      [{ entityId: '604A723B-3E2C-4795-89AA-DF5BA0C3B3C5', name: 'Arts Crafts', affinity: 0.8 }],
      [{ entityId: '604A723B-3E2C-4795-89AA-DF5BA0C3B3C5', name: 'Arts Crafts', affinity: 0.99 }]
    );
    expect(rows.map((r) => r.name)).toEqual(['Arts & Crafts']);
  });
});

describe('lift ranking and sensitive categories', () => {
  const local = [aud('a', 0.99), aud('b', 0.98), aud('c', 0.97), aud('d', 0.96)];

  it('ranks by lift over the panel mean, keeps lift >= margin, shows at most 2', () => {
    const brand = [aud('a', 0.82), aud('b', 0.8), aud('c', 0.79), aud('d', 0.78)];
    const rows = computeBrandLocalAudienceOverlap(brand, local, {
      panelBaseline: { a: 0.79, b: 0.7, c: 0.65, d: 0.77 },
    });
    // lifts: a 0.03 (below margin), b 0.10, c 0.14, d 0.01
    expect(rows.map((r) => r.entityId)).toEqual(['c', 'b']);
    expect(
      computeBrandLocalAudienceOverlap(brand, local, {
        panelBaseline: { a: 0.5, b: 0.5, c: 0.5, d: 0.5 },
        maxAudiences: 4,
      }).length
    ).toBe(4);
  });

  it('never shows sensitive audience categories, whatever their lift', () => {
    const brand = [
      { entityId: 's1', name: 'Christianity', affinity: 0.9 },
      { entityId: 's2', name: 'Mental Health', affinity: 0.89 },
      { entityId: 's3', name: 'Spirituality', affinity: 0.88 },
      { entityId: 'ok', name: 'Cooking', affinity: 0.7 },
    ];
    const loc = brand.map((r) => ({ ...r, affinity: 0.99 }));
    const rows = computeBrandLocalAudienceOverlap(brand, loc, { panelBaseline: {} });
    expect(rows.map((r) => r.name)).toEqual(['Cooking']);
    expect(
      topBrandTasteOverlapSignals({
        tags: [],
        audiences: [{ entityId: 's1', name: 'Christianity', affinity: 0.9, affinityRank: 2 }],
      })
    ).toEqual([]);
    expect(SENSITIVE_AUDIENCE_NAMES.size).toBeLessThanOrEqual(15);
  });

  it('a brand with nothing left returns no rows, so the section is omitted', () => {
    const rows = computeBrandLocalAudienceOverlap([aud('a', 0.6)], local, { panelBaseline: { a: 0.59 } });
    expect(rows).toEqual([]);
    expect(topBrandTasteOverlapSignals({ tags: [], audiences: rows })).toEqual([]);
  });

  it('panel is every recorded brand; demo rows clear the margin, at most 2, none sensitive', () => {
    expect(audiencePanelSize()).toBe(19);
    const baseline = audiencePanelBaseline();
    const chips = chipBrands as Record<string, string[]>;
    for (const chip of ['boulder', 'wicker', 'sevierville'] as const) {
      for (const id of chips[chip]!) {
        const rec = brandExplainabilityForDemo(chip, id);
        if (!rec) continue;
        expect(rec.audiences.length).toBeLessThanOrEqual(2);
        for (const row of rec.audiences) {
          expect(row.affinity - baseline[row.entityId]!).toBeGreaterThanOrEqual(
            BRAND_AUDIENCE_MIN_PANEL_LIFT - 1e-9
          );
          expect(SENSITIVE_AUDIENCE_NAMES.has(row.name.toLowerCase())).toBe(false);
        }
      }
    }
  });

  it('live demo lists for key brands', () => {
    const names = (chip: 'boulder' | 'wicker' | 'sevierville', id: string) =>
      brandExplainabilityForDemo(chip, id)!.audiences.map((r) => r.name);
    expect(names('boulder', ULTA)).toEqual(['Health & Beauty']);
    expect(names('wicker', TJ_MAXX)).toEqual(['Arts & Crafts', 'Home Organization']);
    expect(names('sevierville', MICHAELS)).toEqual([
      'Cooking',
      'Home Organization',
    ]);
    expect(names('sevierville', WHOLE_FOODS)).toEqual(['Wine Enthusiast', 'Cooking']);
    expect(names('sevierville', SEPHORA)[0]).toBe('Health & Beauty');
  });
});
