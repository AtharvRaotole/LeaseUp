import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures/worker';
import { OSM_SNAPSHOT_RECORDED_AT as DEMO_DATA_RECORDED_AT } from '../data/osm-snapshot-meta';
import type { AnalysisResponse } from '@leaseup/contracts';
import type { Env } from '../index';
import { analysisRouter } from '../routes/analysis';
import { errorHandler } from '../middleware/error-handler';
import {
  clearRecordedDemoReportMemo,
  recordedDemoChipId,
  recordedDemoReport,
} from '../lib/recorded-demo-report';

type DbCall = { sql: string; method: string };

/** D1 stub that records every statement and reports the daily live cap as used up. */
function exhaustedCapDb(calls: DbCall[]): D1Database {
  return {
    prepare: (sql: string) => {
      const stmt = {
        bind: () => stmt,
        run: async () => {
          calls.push({ sql, method: 'run' });
          return {};
        },
        first: async () => {
          calls.push({ sql, method: 'first' });
          return sql.includes('rate_limits') ? { count: 48 } : null;
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}

function kvThatFails(): KVNamespace {
  return {
    get: async () => {
      throw new Error('KV must not be read for recorded demo reports');
    },
    put: async () => {
      throw new Error('KV must not be written for recorded demo reports');
    },
  } as unknown as KVNamespace;
}

function liveEnv(calls: DbCall[]): Env {
  return {
    DB: exhaustedCapDb(calls),
    CACHE: kvThatFails(),
    APP_MODE: 'live',
    QLOO_API_KEY: 'test-key',
    OPENAI_API_KEY: 'test-key',
  } as unknown as Env;
}

function app() {
  const a = new Hono<{ Bindings: Env }>();
  a.route('/api', analysisRouter);
  a.onError(errorHandler);
  return a;
}

const fetchSpy = vi.fn(async () => {
  throw new Error('recorded demo reports must not make network calls');
});

beforeEach(() => {
  clearRecordedDemoReportMemo();
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('recordedDemoChipId', () => {
  it('matches the three chips at the recorded radius with no category filter', () => {
    expect(recordedDemoChipId({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 })).toBe('wicker');
    expect(recordedDemoChipId({ address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 })).toBe('boulder');
    expect(recordedDemoChipId({ address: DEMO_CHIP_ADDRESSES.sevierville, radius: 10 })).toBe(
      'sevierville'
    );
  });

  it('sends other searches down the live path', () => {
    expect(recordedDemoChipId({ address: '100 Main St, Austin, TX 78701', radius: 10 })).toBeNull();
    expect(recordedDemoChipId({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 5 })).toBeNull();
    expect(
      recordedDemoChipId({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10, categoryTags: ['apparel'] })
    ).toBeNull();
  });
});

describe('recorded demo chip reports', () => {
  it.each(['wicker', 'boulder', 'sevierville'] as const)(
    'serves %s read-only with recorded planner steps while the live cap is exhausted',
    async (chip) => {
      const calls: DbCall[] = [];
      const res = await app().request(`/api/demo-report/${chip}`, {}, liveEnv(calls));
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('max-age');
      const body = (await res.json()) as AnalysisResponse;
      expect(body.mode).toBe('demo');
      expect(body.timestamp).toBe(DEMO_DATA_RECORDED_AT);
      expect(body.location.address).toBe(DEMO_CHIP_ADDRESSES[chip]);
      const stepIds = (body.agentSteps ?? []).map((s) => s.id);
      expect(stepIds).toEqual(
        expect.arrayContaining(['locate', 'taste', 'backtest', 'prospects', 'verify'])
      );
      for (const step of body.agentSteps ?? []) {
        expect(step.status).toBe('complete');
        expect(step.durationMs).toBeUndefined();
      }
      expect(calls).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  it('POST /api/analyze for a chip replays the recording without the quota or D1', async () => {
    const calls: DbCall[] = [];
    const res = await app().request(
      '/api/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10, storefrontSqFt: 2500 }),
      },
      liveEnv(calls)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as AnalysisResponse;
    expect(body.mode).toBe('demo');
    expect(calls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('404s an unknown chip', async () => {
    const res = await app().request('/api/demo-report/nowhere', {}, liveEnv([]));
    expect(res.status).toBe(404);
  });

  it('adds taste-twin markets to recorded chip pitches without any network call', async () => {
    const env = liveEnv([]);
    for (const chip of ['wicker', 'boulder', 'sevierville'] as const) {
      const report = await recordedDemoReport(env, chip);
      const withTwins = report.prospects.filter((p) => p.tasteTwins);
      expect(withTwins.length).toBeGreaterThan(0);
      for (const p of withTwins) {
        expect(p.tasteTwins!.of).toBe(5);
        expect(p.tasteTwins!.twins).not.toContain(chip === 'wicker' ? 'Wicker Park, Chicago' : chip === 'boulder' ? 'Pearl St, Boulder' : 'Sevierville, TN');
      }
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('memoizes per isolate so repeat loads reuse one replay', async () => {
    const env = liveEnv([]);
    const a = recordedDemoReport(env, 'boulder');
    const b = recordedDemoReport(env, 'boulder');
    expect(a).toBe(b);
    await a;
  });
});

describe('ordinary live searches keep the daily cap', () => {
  it('returns 429 with the daily quota code and a reset delay', async () => {
    const calls: DbCall[] = [];
    const res = await app().request(
      '/api/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '100 Congress Ave, Austin, TX 78701',
          radius: 10,
          confirmedLocation: {
            address: '100 Congress Ave, Austin, TX 78701',
            latitude: 30.2638,
            longitude: -97.7446,
          },
        }),
      },
      liveEnv(calls)
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { code: string; retryAfter: number };
    expect(body.code).toBe('LIVE_QLOO_JUDGE_QUOTA_EXCEEDED');
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(calls.some((c) => c.sql.includes('rate_limits'))).toBe(true);
  });
});

describe('recorded demo report address', () => {
  it('keeps a legacy chip spelling and ignores an address for another chip', async () => {
    const mod = await import('../lib/recorded-demo-report');
    expect(mod.recordedDemoAddress('wicker', '1574 N Milwaukee Ave, Chicago, IL 60622')).toBe(
      '1574 N Milwaukee Ave, Chicago, IL 60622'
    );
    expect(mod.recordedDemoAddress('wicker', '1300 Pearl St, Boulder, CO 80302')).toBe(
      '1560 N Milwaukee Ave, Chicago, IL 60622'
    );
    expect(mod.recordedDemoAddress('boulder')).toBe('1300 Pearl St, Boulder, CO 80302');
  });
});

describe('analyze stream error payload', () => {
  it('keeps the daily quota code and reset delay for the web copy', async () => {
    const { analyzeStreamErrorPayload } = await import('../lib/analyze-stream-error');
    const { LiveQlooJudgeQuotaError } = await import('../lib/live-qloo-judge-quota');
    const payload = analyzeStreamErrorPayload(new LiveQlooJudgeQuotaError(3600));
    expect(payload.code).toBe('LIVE_QLOO_JUDGE_QUOTA_EXCEEDED');
    expect(payload.retryAfterSec).toBe(3600);
  });
});
