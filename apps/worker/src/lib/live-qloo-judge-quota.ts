/** Caps cold live Qloo analyzes per UTC day so hackathon judges cannot exhaust the shared key. */
export const LIVE_QLOO_JUDGE_DAILY_CAP_DEFAULT = 48;

export class LiveQlooJudgeQuotaError extends Error {
  readonly code = 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED';
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(
      'Daily live Qloo analyze limit reached for this worker. Use a demo chip on production or try again tomorrow.'
    );
    this.name = 'LiveQlooJudgeQuotaError';
    this.retryAfterSec = retryAfterSec;
  }
}

export function liveQlooJudgeDailyCap(env: { LIVE_QLOO_JUDGE_DAILY_CAP?: string }): number {
  const raw = env.LIVE_QLOO_JUDGE_DAILY_CAP?.trim();
  if (!raw) return LIVE_QLOO_JUDGE_DAILY_CAP_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return LIVE_QLOO_JUDGE_DAILY_CAP_DEFAULT;
  return n;
}

function utcDayKey(nowSec: number): string {
  const day = new Date(nowSec * 1000).toISOString().slice(0, 10);
  return `live-qloo-judge:${day}`;
}

function secondsUntilUtcDayEnd(nowSec: number): number {
  const d = new Date(nowSec * 1000);
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
  return Math.max(1, Math.ceil((end - nowSec * 1000) / 1000));
}

export async function assertLiveQlooJudgeQuotaAllowed(
  db: D1Database,
  cap: number,
  nowSec: number
): Promise<void> {
  const key = utcDayKey(nowSec);
  const row = await db
    .prepare('SELECT count FROM rate_limits WHERE id = ?')
    .bind(key)
    .first<{ count: number }>();
  if (row && row.count >= cap) {
    throw new LiveQlooJudgeQuotaError(secondsUntilUtcDayEnd(nowSec));
  }
}

export async function recordLiveQlooJudgeQuotaUse(
  db: D1Database,
  nowSec: number
): Promise<void> {
  const key = utcDayKey(nowSec);
  const row = await db
    .prepare('SELECT count FROM rate_limits WHERE id = ?')
    .bind(key)
    .first<{ count: number }>();
  const count = row ? row.count + 1 : 1;
  await db
    .prepare(
      'INSERT INTO rate_limits (id, count, window_start, created_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET count = ?'
    )
    .bind(key, count, nowSec, nowSec, count)
    .run();
}

export async function consumeLiveQlooJudgeQuota(
  db: D1Database,
  cap: number,
  nowSec: number
): Promise<void> {
  await assertLiveQlooJudgeQuotaAllowed(db, cap, nowSec);
  await recordLiveQlooJudgeQuotaUse(db, nowSec);
}
