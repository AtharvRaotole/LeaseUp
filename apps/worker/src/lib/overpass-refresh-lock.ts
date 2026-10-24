const locks = new Map<string, number>();

/** In-process dedupe for optional live Overpass refresh (no KV). */
export function tryAcquireOverpassRefreshLock(key: string, ttlMs = 60_000): boolean {
  const now = Date.now();
  const exp = locks.get(key);
  if (exp !== undefined && exp > now) return false;
  locks.set(key, now + ttlMs);
  return true;
}
