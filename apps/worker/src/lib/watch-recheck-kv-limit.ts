/**
 * Per-visitor daily recheck budget in KV (1 put per successful recheck).
 * Keeps total KV writes well under the Cloudflare free tier (1,000 writes/day).
 */

/** Max successful rechecks per visitor per UTC day. */
export const VISITOR_RECHECK_KV_MAX_PER_DAY = 12;

/** Documented KV write count per successful recheck (visitor daily counter). */
export const KV_WRITES_PER_WATCH_RECHECK = 1;

export class RecheckDailyLimitError extends Error {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super('Visitor daily recheck limit reached');
    this.retryAfterSec = retryAfterSec;
  }
}

function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function secondsUntilUtcDayEnd(nowMs: number): number {
  const end = new Date(utcDayKey(nowMs) + 'T23:59:59.999Z').getTime();
  return Math.max(60, Math.ceil((end - nowMs) / 1000) + 60);
}

function visitorDayKey(visitorId: string, day: string): string {
  return `watch-recheck:${visitorId}:${day}`;
}

export async function assertVisitorRecheckKvAllowed(
  kv: KVNamespace,
  visitorId: string,
  nowMs: number
): Promise<void> {
  const day = utcDayKey(nowMs);
  const raw = await kv.get(visitorDayKey(visitorId, day));
  const count = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(count)) return;
  if (count >= VISITOR_RECHECK_KV_MAX_PER_DAY) {
    throw new RecheckDailyLimitError(secondsUntilUtcDayEnd(nowMs));
  }
}

export async function recordVisitorRecheckKv(
  kv: KVNamespace,
  visitorId: string,
  nowMs: number
): Promise<void> {
  const day = utcDayKey(nowMs);
  const key = visitorDayKey(visitorId, day);
  const raw = await kv.get(key);
  const count = raw ? Number.parseInt(raw, 10) : 0;
  const next = Number.isFinite(count) ? count + 1 : 1;
  await kv.put(key, String(next), { expirationTtl: secondsUntilUtcDayEnd(nowMs) });
}
