import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fixtures from '@leaseup/fixtures/worker';
import { buildStrictEvalSnapshot } from '../lib/strict-eval-snapshot';
import type { StoreCatalog } from '../services/store-catalog';

describe('strict eval on worker (CPU guard)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never runs Monte Carlo shuffles on non-demo analyze path', async () => {
    const spy = vi.spyOn(fixtures, 'computeStrictEval');
    const catalog = {
      getBrandIds: () => ['A'],
      findStoresNearby: async () => [],
    } as unknown as StoreCatalog;

    await buildStrictEvalSnapshot(
      {
        address: '1 Unknown St, Nowhere, ZZ 00000',
        latitude: 40,
        longitude: -100,
        neighborhood: undefined,
      },
      [{ entity_id: 'A', name: 'Brand A', query: { affinity: 0.9 } }],
      10,
      'suburban',
      catalog
    );

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    const options = lastCall[6] as { monteCarloDraws?: number };
    expect(options?.monteCarloDraws).toBe(0);
  });
});
