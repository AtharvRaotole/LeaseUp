import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as quota from '../lib/live-qloo-judge-quota';
import { AnalysisService } from '../services/analysis';
import { COLD_ANALYZE_ADDRESS, installColdAnalyzeFetchMock } from './helpers/cold-analyze-fetch-mock';
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

describe('prospecting + analyze judge quota', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    installColdAnalyzeFetchMock({ qlooDelayMs: 0, coldLat: 30.2672, coldLon: -97.7431 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzeWithSteps does not consume quota twice when prospecting already consumed', async () => {
    const consume = vi.spyOn(quota, 'consumeLiveQlooJudgeQuota').mockResolvedValue();
    const service = new AnalysisService({
      DB: db,
      CACHE: { get: async () => null, put: async () => undefined } as unknown as KVNamespace,
      APP_MODE: 'live',
      QLOO_API_KEY: 'test-key',
    } as import('../index').Env);

    await service.analyzeWithSteps(
      { address: COLD_ANALYZE_ADDRESS, radius: 10 },
      'quota-once',
      'ip',
      undefined,
      { judgeQuotaAlreadyConsumed: true }
    );

    expect(consume).not.toHaveBeenCalled();
  });
});
