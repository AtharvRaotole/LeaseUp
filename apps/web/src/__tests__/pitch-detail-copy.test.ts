import { describe, it, expect } from 'vitest';
import { pitchExpandedLines } from '../lib/pitch-detail-copy';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

describe('pitchExpandedLines', () => {
  it('does not duplicate snapshot date in verification line', () => {
    const prospect = {
      brand: { entityId: 'x', name: 'Test', affinityRank: 1, verified: 'verified (2 sources)' },
    } as ProspectPack;
    const results = {
      rankings: [{ entityId: 'x', name: 'Test' }],
      osmSnapshotLabel: 'OpenStreetMap snapshot',
      osmSnapshotRecordedAt: '2026-10-23T04:57:36.264Z',
      timestamp: '2026-10-23T04:57:36.264Z',
    } as AnalysisResponse;

    const line = pitchExpandedLines(prospect, results, 10).at(-1);
    expect(line).toMatch(/as of Oct 23, 2026/);
    expect(line).toMatch(/Store checks use/);
    expect(line).not.toMatch(/on Oct 23, 2026 on/);
    expect(line).not.toMatch(/snapshot, Oct 23, 2026 on/);
  });
});
