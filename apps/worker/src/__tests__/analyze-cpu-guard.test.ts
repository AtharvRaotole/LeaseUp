import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fixtures from '@leaseup/fixtures/worker';
import { AnalysisService } from '../services/analysis';
import {
  COLD_ANALYZE_ADDRESS,
  installColdAnalyzeFetchMock,
} from './helpers/cold-analyze-fetch-mock';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

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

describe('cold analyze CPU guard', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    installColdAnalyzeFetchMock({
      qlooDelayMs: 0,
      coldLat: 30.2672,
      coldLon: -97.7431,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never runs Monte Carlo shuffles on cold live analyze', async () => {
    const spy = vi.spyOn(fixtures, 'computeStrictEval');
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'live',
      QLOO_API_KEY: 'test-key',
    } as import('../index').Env);

    await service.analyze({ address: COLD_ANALYZE_ADDRESS, radius: 10 }, 'cpu-guard', 'ip');

    expect(spy).toHaveBeenCalled();
    const options = spy.mock.calls.at(-1)![6] as { monteCarloDraws?: number };
    expect(options?.monteCarloDraws).toBe(0);
  });
});
