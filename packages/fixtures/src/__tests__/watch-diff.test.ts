import { describe, expect, it } from 'vitest';
import { diffWatchSnapshots, buildWatchRunSnapshot } from '../watch-diff.js';
import type { WatchRunSnapshot } from '../watch-diff.js';

function snap(brands: WatchRunSnapshot['brands']): WatchRunSnapshot {
  return {
    snapshotId: '00000000-0000-4000-8000-000000000001',
    recordedAt: '2026-10-23T00:00:00.000Z',
    runId: 'run-a',
    brands,
  };
}

describe('diffWatchSnapshots', () => {
  it('detects new and dropped top 10 brands', () => {
    const previous = snap([
      { entityId: 'a', name: 'Alpha', affinityRank: 1 },
      { entityId: 'b', name: 'Beta', affinityRank: 2 },
    ]);
    const current = snap([
      { entityId: 'a', name: 'Alpha', affinityRank: 1 },
      { entityId: 'c', name: 'Gamma', affinityRank: 3 },
    ]);
    const diff = diffWatchSnapshots(previous, current, 10);
    expect(diff.kind).toBe('changes');
    expect(diff.newInTop10.map((b) => b.name)).toEqual(['Gamma']);
    expect(diff.droppedFromTop10.map((b) => b.name)).toEqual(['Beta']);
  });

  it('detects a brand that gained a nearby store', () => {
    const previous = snap([
      { entityId: 'a', name: 'Alpha', affinityRank: 1, nearestExistingStoreKm: undefined },
    ]);
    const current = snap([
      { entityId: 'a', name: 'Alpha', affinityRank: 1, nearestExistingStoreKm: 2.4 },
    ]);
    const diff = diffWatchSnapshots(previous, current, 10);
    expect(diff.newlyOpenedStore.map((b) => b.name)).toEqual(['Alpha']);
  });

  it('reports no_changes when snapshots match', () => {
    const row = { entityId: 'a', name: 'Alpha', affinityRank: 1 };
    const previous = snap([row]);
    const current = snap([row]);
    const diff = diffWatchSnapshots(previous, current, 10);
    expect(diff.kind).toBe('no_changes');
  });
});

describe('buildWatchRunSnapshot', () => {
  it('keeps only the first ten prospects', () => {
    const analysis = {
      location: { address: '1 Main', latitude: 0, longitude: 0 },
      backtest: { totalStores: 0, predictedStores: 0, accuracy: 0, precisionAt10: 0, examples: [] },
      prospects: Array.from({ length: 12 }, (_, i) => ({
        brand: {
          entityId: `id-${i}`,
          name: `Brand ${i}`,
          affinity: 0.9,
          affinityRank: i + 1,
          verified: 'verified',
        },
        outreachDraft: 'Hi',
        reasons: [],
      })),
      dataQuality: 'high' as const,
      warnings: [],
      runId: 'run',
      timestamp: '2026-10-23T00:00:00.000Z',
    };
    const built = buildWatchRunSnapshot(analysis, '00000000-0000-4000-8000-000000000099');
    expect(built.brands).toHaveLength(10);
    expect(built.brands[0]?.entityId).toBe('id-0');
  });
});
