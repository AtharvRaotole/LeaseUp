/** Per-watch cooldown: caps D1 rate_limits upserts (no KV writes) well under free-tier daily limits. */
export function watchRecheckCooldownSec(): number {
  const raw =
    typeof process !== 'undefined' && process.env.WATCH_RECHECK_COOLDOWN_SEC
      ? Number.parseInt(process.env.WATCH_RECHECK_COOLDOWN_SEC, 10)
      : NaN;
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 600;
}

export class RecheckCooldownError extends Error {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super('Recheck cooldown active');
    this.retryAfterSec = retryAfterSec;
  }
}

function recheckKey(watchId: string): string {
  return `watch-recheck:${watchId}`;
}

export async function assertRecheckAllowed(
  db: D1Database,
  watchId: string,
  nowSec: number
): Promise<void> {
  const row = await db
    .prepare('SELECT window_start FROM rate_limits WHERE id = ?')
    .bind(recheckKey(watchId))
    .first<{ window_start: number }>();
  if (!row) return;
  const elapsed = nowSec - row.window_start;
  const cooldown = watchRecheckCooldownSec();
  if (elapsed < cooldown) {
    throw new RecheckCooldownError(cooldown - elapsed);
  }
}

export async function markRecheckCompleted(db: D1Database, watchId: string, nowSec: number): Promise<void> {
  await db
    .prepare(
      'INSERT INTO rate_limits (id, count, window_start, created_at) VALUES (?, 1, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET window_start = ?, count = 1'
    )
    .bind(recheckKey(watchId), nowSec, nowSec, nowSec)
    .run();
}
