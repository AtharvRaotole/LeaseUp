import { describe, expect, it, vi } from 'vitest';
import { loadTradeAreaShoppersSnapshot } from '../lib/trade-area-shoppers';
import { WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE } from '@leaseup/fixtures/worker';
import type { ResponseCache } from '../lib/response-cache';

function mockCache(): ResponseCache {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn(),
    putTextIfChanged: vi.fn().mockResolvedValue(true),
    putJsonIfChanged: vi.fn().mockResolvedValue(true),
  } as unknown as ResponseCache;
}

describe('loadTradeAreaShoppersSnapshot', () => {
  it('parses demo wicker fixture into grouped names', async () => {
    const snap = await loadTradeAreaShoppersSnapshot({
      qloo: { getTradeAreaShopperTagInsights: vi.fn() } as never,
      responseCache: mockCache(),
      location: {
        address: DEMO_WICKER_ADDRESS,
        latitude: 41.9088,
        longitude: -87.6776,
      },
      radiusKm: 1.5,
      mode: 'demo',
    });
    expect(snap?.groups.find((g) => g.id === 'customer_identity')?.names[0]).toBe('Beer Enthusiasts');
    expect(snap?.groups.find((g) => g.id === 'ambience')?.names).toEqual(['Social']);
  });

  it('parses live Qloo payload shape from cache path', async () => {
    const cache = mockCache();
    vi.mocked(cache.get).mockResolvedValue(JSON.stringify(WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE));

    const snap = await loadTradeAreaShoppersSnapshot({
      qloo: {
        getTradeAreaShopperTagInsights: vi.fn().mockResolvedValue(WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE),
      } as never,
      responseCache: cache,
      location: {
        address: '999 Unknown St, Chicago IL',
        latitude: 41.9,
        longitude: -87.6,
      },
      radiusKm: 2,
      mode: 'live',
    });

    expect(snap?.groups).toHaveLength(2);
    expect(snap?.groups[0]?.names).toContain('Beer Enthusiasts');
  });
});

const DEMO_WICKER_ADDRESS = '1560 N Milwaukee Ave, Chicago, IL 60622';
