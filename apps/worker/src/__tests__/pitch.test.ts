import { describe, it, expect, beforeEach } from 'vitest';
import { PitchService } from '../services/pitch';
import type { AnalysisResponse } from '@leaseup/contracts';

const pitchStore = new Map<string, string>();

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO pitch_packs')) {
          pitchStore.set(String(this.binds[0]), String(this.binds[1]));
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT payload FROM pitch_packs')) {
          const payload = pitchStore.get(String(this.binds[0]));
          return payload ? { payload } : null;
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

function minimalResults(lat: number, lon: number): AnalysisResponse {
  return {
    location: {
      address: '1 Bleecker St, New York, NY',
      latitude: lat,
      longitude: lon,
      neighborhood: 'NoHo',
    },
    backtest: {
      totalStores: 10,
      predictedStores: 5,
      accuracy: 0.5,
      precisionAt10: 0.5,
      examples: [],
    },
    prospects: [
      {
        brand: {
          entityId: 'a',
          name: 'Brand A',
          affinity: 0.9,
          affinityRank: 1,
          verified: 'verified (2 sources)',
        },
        outreachDraft: 'Hi',
        reasons: ['Strong local taste fit'],
        nearestExistingStoreKm: 2.5,
      },
      {
        brand: {
          entityId: 'b',
          name: 'Brand B',
          affinity: 0.8,
          affinityRank: 2,
          verified: 'unverified (1 source)',
        },
        outreachDraft: 'Hi',
        reasons: [],
        nearestExistingStoreKm: 8.1,
      },
    ],
    dataQuality: 'high',
    warnings: [],
    runId: 'run-test',
    timestamp: '2026-01-01T00:00:00.000Z',
    mode: 'demo',
    rankings: Array.from({ length: 100 }, (_, i) => ({
      entityId: `e${i}`,
      name: `Brand ${i}`,
      affinity: 0.5,
      qlooRank: i + 1,
      blendedRank: i + 1,
      presentInRadius: false,
    })),
  };
}

describe('PitchService', () => {
  beforeEach(() => pitchStore.clear());

  it('stores immutable snapshot with top prospects and why lines', async () => {
    const service = new PitchService({ DB: db } as import('../index').Env);
    const created = await service.create({
      results: minimalResults(40.73, -73.99),
      radiusKm: 10,
      mapImage: 'data:image/jpeg;base64,abc',
      landlord: { name: 'Jane Broker', contact: 'jane@example.com' },
    });
    expect(created.prospects).toHaveLength(2);
    expect(created.prospects[0]!.whyLine).toContain('Strong local taste fit');
    expect(created.landlord?.name).toBe('Jane Broker');

    const loaded = await service.get(created.id);
    expect(loaded?.location.latitude).toBe(40.73);
    expect(loaded?.mapImage).toBe('data:image/jpeg;base64,abc');
  });
});
