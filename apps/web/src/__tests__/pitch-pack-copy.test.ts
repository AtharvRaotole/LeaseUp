import { describe, it, expect } from 'vitest';
import {
  pitchExecutiveSummaryLines,
  pitchProspectFact,
  shouldShowStoredWhyLine,
} from '../lib/pitch-pack-copy';
import type { PitchPackSnapshot } from '@leaseup/contracts';

describe('pitch pack copy', () => {
  it('builds executive summary from snapshot data', () => {
    const snapshot = {
      prospects: [
        { prospect: { brand: { entityId: 'a', name: 'Nike', affinity: 1, affinityRank: 1, verified: 'verified (2 sources)' }, outreachDraft: '', reasons: [] }, whyLine: '' },
        { prospect: { brand: { entityId: 'b', name: 'Vans', affinity: 1, affinityRank: 2, verified: 'verified (2 sources)' }, outreachDraft: '', reasons: [] }, whyLine: '' },
      ],
      radiusKm: 10,
      osmSnapshotLabel: 'OpenStreetMap',
    } as Pick<PitchPackSnapshot, 'prospects' | 'radiusKm' | 'osmSnapshotLabel'>;
    const lines = pitchExecutiveSummaryLines(snapshot as PitchPackSnapshot);
    expect(lines[0]).toContain('2 brands');
    expect(lines[1]).toContain('Nike');
  });

  it('uses nearest store fact', () => {
    const fact = pitchProspectFact(
      {
        brand: { entityId: 'x', name: 'Test', affinity: 1, affinityRank: 1, verified: 'verified (2 sources)' },
        outreachDraft: '',
        reasons: [],
        nearestExistingStoreKm: 4.2,
      },
      10
    );
    expect(fact).toContain('4.2 km');
  });

  it('hides rank-only why lines', () => {
    expect(shouldShowStoredWhyLine('Qloo rank #8 (top 5%) in Pearl Street')).toBe(false);
    expect(shouldShowStoredWhyLine('Strong co-tenancy with local apparel')).toBe(true);
  });
});
