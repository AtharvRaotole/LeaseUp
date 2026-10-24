import { describe, expect, it } from 'vitest';
import { legacyProspectStatus, normalizePipelineCard } from '../lib/pipeline-legacy';

describe('pipeline legacy cards', () => {
  it('maps old column and outreach fields to prospect status', () => {
    expect(
      legacyProspectStatus({
        id: '1',
        column: 'contacted',
        outreachStatus: 'sent',
        sortOrder: 0,
        brandEntityId: 'b',
        brandName: 'X',
        propertyAddress: 'a',
        affinityRank: 1,
        verification: 'ok',
        notes: '',
        lastTouchedAt: '2026-01-01T00:00:00.000Z',
      })
    ).toBe('sent_by_me');
  });

  it('normalizes legacy card into schema', () => {
    const card = normalizePipelineCard({
      id: '00000000-0000-4000-8000-000000000099',
      column: 'loi',
      sortOrder: 0,
      brandEntityId: 'b',
      brandName: 'X',
      propertyAddress: 'a',
      affinityRank: 1,
      verification: 'ok',
      notes: '',
      lastTouchedAt: '2026-01-01T00:00:00.000Z',
      outreachStatus: 'none',
    });
    expect(card.prospectStatus).toBe('loi');
  });
});
