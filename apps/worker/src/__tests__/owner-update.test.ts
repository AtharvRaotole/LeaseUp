import { describe, expect, it } from 'vitest';
import { buildOwnerUpdateSnapshot, cardsForProperty } from '../lib/owner-update';
import type { PipelineBoard } from '@leaseup/contracts';

const board: PipelineBoard = {
  workspaceId: 'ws-1',
  shareId: 'share-1',
  createdAt: '2026-10-23T00:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
  cards: [
    {
      id: 'c1',
      column: 'contacted',
      sortOrder: 0,
      brandEntityId: 'B13C02E3-BA3C-4B39-85B4-ACF12FEBC892',
      brandName: 'Starbucks',
      propertyAddress: '1574 N Milwaukee Ave, Chicago, IL 60622',
      propertyNeighborhood: 'Wicker Park',
      affinityRank: 2,
      verification: 'verified (2 sources)',
      notes: 'Left VM with RE inbox',
      lastTouchedAt: '2026-10-22T00:00:00.000Z',
      outreachStatus: 'drafted',
    },
  ],
};

describe('owner update snapshot', () => {
  it('filters cards by property address', () => {
    const cards = cardsForProperty(board, '1574 N Milwaukee Ave, Chicago, IL 60622');
    expect(cards).toHaveLength(1);
  });

  it('builds honest snapshot from pipeline data', () => {
    const snap = buildOwnerUpdateSnapshot(board, '1574 N Milwaukee Ave, Chicago, IL 60622');
    expect(snap.brandsContacted).toBe(1);
    expect(snap.brands[0]?.brandName).toBe('Starbucks');
    expect(snap.brands[0]?.notes).toContain('VM');
  });

  it('empty when no cards for property', () => {
    const snap = buildOwnerUpdateSnapshot(board, '999 Unknown St');
    expect(snap.brands).toHaveLength(0);
    expect(snap.brandsContacted).toBe(0);
  });
});
