import { describe, it, expect } from 'vitest';
import { brandExplainabilityForDemo } from '@leaseup/fixtures';
import { topBrandTasteOverlapSignals } from '@leaseup/fixtures';
import { prospectOneLineReason } from '../lib/prospect-one-line';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const VS = 'D3310425-7161-41FC-8C2C-5435AF0F0A5B';
const VANS = 'AC8F9047-F23D-4A54-BBAA-A3CBD2991C02';
const HM = '108EB684-257B-42D7-84E5-6E9D8BE3E793';
const TJ = 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6';

const baseResults = { rankings: Array.from({ length: 224 }, (_, i) => ({ entityId: `e${i}`, name: `B${i}`, affinity: 0.5, qlooRank: i + 1, blendedRank: i + 1, presentInRadius: false })) } as AnalysisResponse;

function packFromExplainability(brandId: string, brandName: string): ProspectPack {
  const rec = brandExplainabilityForDemo('wicker', brandId, { maxAudiences: 12 });
  const signals = topBrandTasteOverlapSignals(
    rec ? { tags: [], audiences: rec.audiences } : undefined,
    1
  );
  return {
    brand: { entityId: brandId, name: brandName, affinity: 0.8, affinityRank: 10, verified: 'unverified' },
    outreachDraft: '',
    reasons: [],
    tradeAreaTaste: rec ? { tags: [], audiences: rec.audiences } : undefined,
    whyBrandTaste: signals.length ? { signals, summary: 'x' } : undefined,
  } as ProspectPack;
}

describe('Wicker pitch one-liner audiences', () => {
  it('does not surface Sneakerheads for Victoria Secret or H&M', () => {
    const vs = prospectOneLineReason(packFromExplainability(VS, "Victoria's Secret"), baseResults, 10);
    const hm = prospectOneLineReason(packFromExplainability(HM, 'H&M'), baseResults, 10);
    expect(vs).not.toContain('Sneakerheads');
    expect(hm).not.toContain('Sneakerheads');
    expect(hm).not.toContain('Jewelry');
  });

  it('keeps Sneakerheads for Vans and Arts & Crafts for TJ Maxx', () => {
    const vans = prospectOneLineReason(packFromExplainability(VANS, 'Vans'), baseResults, 10);
    const tj = prospectOneLineReason(packFromExplainability(TJ, 'TJ Maxx'), baseResults, 10);
    expect(vans).toContain('Shared local audience: Sneakerheads');
    expect(tj).toContain('Shared local audience: Arts & Crafts');
  });
});
