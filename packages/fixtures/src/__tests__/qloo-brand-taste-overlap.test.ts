import { describe, it, expect } from 'vitest';
import {
  computeBrandLocalAudienceOverlap,
  deterministicWhyBrandTasteSummary,
  formatBrandTasteOverlapLine,
  topBrandTasteOverlapSignals,
  audienceDisplayName,
  genericAudienceIdsAtLocation,
  QLOO_AUDIENCE_DISPLAY_NAMES,
} from '../qloo-brand-taste-overlap.js';
import {
  brandExplainabilityForDemo,
  genericAudienceIdsForDemoChip,
  listDemoExplainabilityRecordings,
} from '../brand-explainability-loader.js';
import chipBrands from '../brand-explainability/chip-brands.json';

const ULTA = '0F77E9A4-121C-4941-ACE1-28502DBF1865';
const TJ_MAXX = 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6';

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
  it('uses audiences only, sorted by brand affinity, and ignores tags', () => {
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
    expect(signals.map((s) => s.name)).toEqual(['Health & Beauty', 'Arts & Crafts']);
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

describe('distinctiveness filter', () => {
  const local = [
    { entityId: 'generic', name: 'Generic', affinity: 0.99 },
    { entityId: 'special', name: 'Special', affinity: 0.98 },
  ];
  const brand = (id: string, special: boolean) => ({
    brandEntityId: id,
    audiences: [
      { entityId: 'generic', name: 'Generic', affinity: 0.8 },
      ...(special ? [{ entityId: 'special', name: 'Special', affinity: 0.79 }] : []),
    ],
  });

  it('flags audiences that pass for more than half of the brands at a location', () => {
    const brands = [brand('a', true), brand('b', false), brand('c', false), brand('d', false)];
    const generic = genericAudienceIdsAtLocation(brands, local, () => undefined);
    expect([...generic]).toEqual(['generic']);
  });

  it('exactly half is not generic', () => {
    const brands = [brand('a', true), brand('b', true), brand('c', false), brand('d', false)];
    expect(genericAudienceIdsAtLocation(brands, local, () => undefined).has('special')).toBe(false);
  });

  it('needs at least two brands', () => {
    expect(genericAudienceIdsAtLocation([brand('a', true)], local, () => undefined).size).toBe(0);
  });

  it('excluded audiences never reach the card, and a brand left with none is empty', () => {
    const rows = computeBrandLocalAudienceOverlap(brand('b', false).audiences, local, {
      excludeAudienceIds: new Set(['generic']),
    });
    expect(rows).toEqual([]);
    expect(topBrandTasteOverlapSignals({ tags: [], audiences: rows })).toEqual([]);
  });

  it('no demo row is generic at its chip (passes for more than half the pitched brands)', () => {
    const chips = chipBrands as Record<string, string[]>;
    for (const chip of ['boulder', 'wicker', 'sevierville'] as const) {
      const generic = genericAudienceIdsForDemoChip(chip);
      for (const id of chips[chip]!) {
        for (const row of brandExplainabilityForDemo(chip, id)?.audiences ?? []) {
          expect(generic.has(row.entityId)).toBe(false);
        }
      }
    }
  });

  it('Wicker drops Yoga and Sneakerheads; J.Crew there is left with no section', () => {
    const generic = genericAudienceIdsForDemoChip('wicker');
    const names = listDemoExplainabilityRecordings()
      .filter((r) => r.chip === 'wicker')
      .flatMap((r) => r.audiences.map((a) => a.name));
    expect(generic.size).toBe(2);
    expect(names).not.toContain('Yoga');
    expect(names).not.toContain('Sneakerheads');
    expect(brandExplainabilityForDemo('wicker', 'A4F0BE29-87A4-4074-9ABB-21B215E532FD')!.audiences).toEqual([]);
  });
});
