import { describe, it, expect, vi } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

const db = {
  prepare: () => {
    const stmt = {
      bind: () => stmt,
      run: async () => ({}),
      first: async () => null,
    };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

function demoEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
  } as import('../index').Env;
}

describe('tradeAreaTaste on analyze response', () => {
  it('attaches whyBrandTaste for Boulder Ulta and Wicker TJ Maxx', async () => {
    const service = new AnalysisService(demoEnv());
    const boulder = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 },
      'run-ulta-taste',
      'iphash'
    );
    const ulta = boulder.prospects.find(
      (p) => p.brand.entityId === '0F77E9A4-121C-4941-ACE1-28502DBF1865'
    );
    // Live Qloo recordings: only Health & Beauty passes the brand x local overlap guard for Ulta.
    expect(ulta?.whyBrandTaste?.signals.map((s) => s.name)).toEqual(['Health & Beauty']);
    expect(ulta?.whyBrandTaste?.signals[0]?.kind).toBe('audience');
    expect(ulta?.whyBrandTaste?.summary).toContain('Ulta');

    const wicker = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-tj-taste',
      'iphash'
    );
    const tj = wicker.prospects.find(
      (p) => p.brand.entityId === 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6'
    );
    expect(tj?.whyBrandTaste?.signals.map((s) => s.name)).toEqual(['Arts & Crafts', 'Home Organization']);
    expect(tj?.whyBrandTaste?.summary).toMatch(/TJ Maxx/i);

    // Distinctiveness: Yoga and Sneakerheads pass for most brands pitched at Wicker, so they are dropped;
    // J.Crew is left with nothing and its Why card omits the taste section.
    const jcrew = wicker.prospects.find(
      (p) => p.brand.entityId === 'A4F0BE29-87A4-4074-9ABB-21B215E532FD'
    );
    if (jcrew) expect(jcrew.whyBrandTaste).toBeUndefined();
    for (const p of wicker.prospects) {
      const names = p.whyBrandTaste?.signals.map((s) => s.name) ?? [];
      expect(names).not.toContain('Yoga');
      expect(names).not.toContain('Sneakerheads');
    }
  });

  it('attaches recorded taste for top Sevierville prospect (Sephora)', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.sevierville, radius: 10 },
      'run-taste',
      'iphash'
    );
    const sephora = result.prospects.find(
      (p) => p.brand.entityId === '2C5054E1-8691-4F52-83CD-310D029BA6A3'
    );
    expect(sephora).toBeDefined();
    expect(sephora!.tradeAreaTaste?.tags).toEqual([]);
    expect(sephora!.tradeAreaTaste?.audiences.map((a) => a.name)).toContain('Health & Beauty');
    for (const row of sephora!.tradeAreaTaste?.audiences ?? []) {
      expect(row.affinityRank).toBeGreaterThanOrEqual(1);
      expect(row.affinityRank).toBeLessThanOrEqual(30);
    }
  });

  it('attaches Who shops here snapshot on demo analyze without KV writes', async () => {
    const put = vi.fn();
    const cache = { get: async () => null, put } as unknown as KVNamespace;
    const service = new AnalysisService({ ...demoEnv(), CACHE: cache });
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-shoppers',
      'iphash'
    );
    expect(result.tradeAreaShoppers?.groups.some((g) => g.id === 'customer_identity')).toBe(true);
    expect(
      result.tradeAreaShoppers?.groups.find((g) => g.id === 'customer_identity')?.names
    ).toContain('Beer Enthusiasts');
    expect(put).not.toHaveBeenCalled();
  });

  it('attaches brand reach contacts on prospects when known', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-reach',
      'iphash'
    );
    const withReach = result.prospects.filter((p) => p.brandReach);
    expect(withReach.length).toBeGreaterThan(0);
    for (const pack of withReach) {
      const reach = pack.brandReach!;
      if (reach.status === 'verified') {
        expect(reach.url).toBeTruthy();
      } else {
        expect(reach.status).toBe('not_yet_found');
      }
    }
  });
});
