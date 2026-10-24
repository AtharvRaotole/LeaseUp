import { describe, it, expect } from 'vitest';
import { pitchExpandedLines } from '../lib/pitch-detail-copy';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

describe('pitchExpandedLines', () => {
  it('returns taste summary and signals without store verification lines', () => {
    const prospect = {
      brand: {
        entityId: 'x',
        name: 'Test',
        affinity: 0.9,
        affinityRank: 1,
        verified: 'verified (2 sources)',
      },
      outreachDraft: '',
      reasons: [],
      whyBrandTaste: {
        signals: [{ kind: 'audience', name: 'Health & Beauty', affinity: 0.74, affinityRank: 27 }],
        summary: "Qloo's Test audience leans toward Health & Beauty, which also ranks among the top audiences near this pin.",
      },
    } as ProspectPack;
    const results = {
      rankings: [{ entityId: 'x', name: 'Test' }],
      timestamp: '2026-10-23T04:57:36.264Z',
    } as AnalysisResponse;

    const lines = pitchExpandedLines(prospect, results, 10);
    expect(lines.join(' ')).toContain('Health & Beauty');
    expect(lines.join(' ')).not.toMatch(/All The Places/);
  });
});
