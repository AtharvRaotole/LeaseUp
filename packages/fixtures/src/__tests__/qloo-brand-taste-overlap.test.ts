import { describe, it, expect } from 'vitest';
import {
  computeBrandLocalAudienceOverlap,
  deterministicWhyBrandTasteSummary,
  formatBrandTasteOverlapLine,
  topBrandTasteOverlapSignals,
} from '../qloo-brand-taste-overlap.js';
import { brandExplainabilityForDemo, listDemoExplainabilityRecordings } from '../brand-explainability-loader.js';

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
          { entityId: 'a1', name: 'Arts Crafts', affinity: 0.63, affinityRank: 20 },
          { entityId: 'a2', name: 'Health And Beauty', affinity: 0.74, affinityRank: 27 },
        ],
      },
      3
    );
    expect(signals.map((s) => s.name)).toEqual(['Health And Beauty', 'Arts Crafts']);
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
      audiences: [{ entityId: 'a', name: 'Health And Beauty', affinity: 0.74, affinityRank: 27 }],
    });
    const summary = deterministicWhyBrandTasteSummary('Ulta', signals);
    expect(summary).toContain('Health And Beauty');
    expect(summary).not.toMatch(/[\u2013\u2014]/);
    expect(formatBrandTasteOverlapLine(signals[0]!)).toBe(
      'Audience: Health And Beauty (brand affinity 0.74, #27 locally)'
    );
    expect(deterministicWhyBrandTasteSummary('Ulta', [])).toBe('');
  });
});

describe('live-recorded demo overlap', () => {
  it('Boulder Ulta and Wicker TJ Maxx come from live recordings', () => {
    const ulta = brandExplainabilityForDemo('boulder', ULTA)!;
    expect(ulta.audiences.map((r) => r.name)).toContain('Health And Beauty');
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
