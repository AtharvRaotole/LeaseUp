import { describe, expect, it } from 'vitest';
import {
  assertLiveQlooJudgeQuotaAllowed,
  consumeLiveQlooJudgeQuota,
  LiveQlooJudgeQuotaError,
  liveQlooJudgeDailyCap,
  recordLiveQlooJudgeQuotaUse,
} from '../lib/live-qloo-judge-quota';

const store = new Map<string, { count: number; window_start: number }>();

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO rate_limits')) {
          const id = String(this.binds[0]);
          const count = Number(this.binds[1]);
          const windowStart = Number(this.binds[2]);
          store.set(id, { count, window_start: windowStart });
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT count FROM rate_limits')) {
          const row = store.get(String(this.binds[0]));
          return row ? { count: row.count } : null;
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

describe('live Qloo judge quota', () => {
  it('parses daily cap from env', () => {
    expect(liveQlooJudgeDailyCap({})).toBe(48);
    expect(liveQlooJudgeDailyCap({ LIVE_QLOO_JUDGE_DAILY_CAP: '12' })).toBe(12);
    expect(liveQlooJudgeDailyCap({ LIVE_QLOO_JUDGE_DAILY_CAP: '0' })).toBe(48);
  });

  it('allows analyzes under the cap and blocks at the limit', async () => {
    store.clear();
    const nowSec = 1_761_000_000;
    const cap = 2;
    await consumeLiveQlooJudgeQuota(db, cap, nowSec);
    await consumeLiveQlooJudgeQuota(db, cap, nowSec);
    await expect(assertLiveQlooJudgeQuotaAllowed(db, cap, nowSec)).rejects.toThrow(
      LiveQlooJudgeQuotaError
    );
  });

  it('increments count on record', async () => {
    store.clear();
    const nowSec = 1_761_000_000;
    await recordLiveQlooJudgeQuotaUse(db, nowSec);
    await recordLiveQlooJudgeQuotaUse(db, nowSec);
    await expect(assertLiveQlooJudgeQuotaAllowed(db, 2, nowSec)).rejects.toThrow(
      LiveQlooJudgeQuotaError
    );
    await expect(assertLiveQlooJudgeQuotaAllowed(db, 3, nowSec)).resolves.toBeUndefined();
  });
});
