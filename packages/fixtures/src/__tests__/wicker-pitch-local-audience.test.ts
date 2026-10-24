import { describe, it, expect } from 'vitest';
import { brandExplainabilityForDemo } from '../brand-explainability-loader.js';
import { topBrandTasteOverlapSignals } from '../qloo-brand-taste-overlap.js';

const VS = 'D3310425-7161-41FC-8C2C-5435AF0F0A5B';
const VANS = 'AC8F9047-F23D-4A54-BBAA-A3CBD2991C02';
const HM = '108EB684-257B-42D7-84E5-6E9D8BE3E793';
const TJ = 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6';

function pitchAudienceName(chip: 'wicker', brandId: string): string | undefined {
  const rec = brandExplainabilityForDemo(chip, brandId, { maxAudiences: 12 });
  if (!rec || rec.audiences.length === 0) return undefined;
  const signal = topBrandTasteOverlapSignals({ tags: [], audiences: rec.audiences }, 1)[0];
  return signal?.name;
}

describe('Wicker pitch shared local audience', () => {
  it('uses brand-characteristic overlap ranked by combined affinity', () => {
    expect(pitchAudienceName('wicker', VANS)).toBe('Sneakerheads');
    expect(pitchAudienceName('wicker', TJ)).toBe('Arts & Crafts');
    expect(pitchAudienceName('wicker', VS)).not.toBe('Sneakerheads');
    const hm = pitchAudienceName('wicker', HM);
    expect(hm).not.toBe('Sneakerheads');
    expect(hm).not.toBe('Jewelry');
  });

  it('omits the line when no audience passes overlap gates', () => {
    expect(pitchAudienceName('wicker', '00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });
});
