import { describe, expect, it, beforeEach } from 'vitest';
import { OwnerUpdateShareService } from '../services/owner-update-share';
import { buildOwnerUpdateSnapshot } from '../lib/owner-update';
import type { PipelineBoard } from '@leaseup/contracts';

const ownerUpdateStore = new Map<string, string>();

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO owner_updates')) {
          ownerUpdateStore.set(String(this.binds[0]), String(this.binds[1]));
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT payload FROM owner_updates')) {
          const payload = ownerUpdateStore.get(String(this.binds[0]));
          return payload ? { payload } : null;
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

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
      notes: '',
      lastTouchedAt: '2026-10-22T00:00:00.000Z',
      outreachStatus: 'drafted',
    },
  ],
};

describe('OwnerUpdateShareService', () => {
  beforeEach(() => {
    ownerUpdateStore.clear();
  });

  it('persists and loads snapshots from D1 without KV', async () => {
    const service = new OwnerUpdateShareService({ DB: db } as import('../index').Env);
    const snapshot = buildOwnerUpdateSnapshot(board, '1574 N Milwaukee Ave, Chicago, IL 60622');
    const saved = await service.save(snapshot);
    expect(saved.id).toBe(snapshot.id);

    const loaded = await service.get(snapshot.id);
    expect(loaded?.propertyAddress).toBe(snapshot.propertyAddress);
    expect(loaded?.brands[0]?.brandName).toBe('Starbucks');
  });

  it('returns null for unknown id', async () => {
    const service = new OwnerUpdateShareService({ DB: db } as import('../index').Env);
    expect(await service.get('missing')).toBeNull();
  });
});
