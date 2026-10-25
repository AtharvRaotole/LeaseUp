import { meterSubrequest } from './subrequest-meter';
const CACHE_ORIGIN = 'https://leaseup-edge-cache.internal';

export type ResponseCacheGetType = 'text' | 'json' | 'arrayBuffer';

function cacheUrl(key: string): string {
  return `${CACHE_ORIGIN}/${encodeURIComponent(key)}`;
}

/**
 * Ephemeral HTTP response cache (Workers Cache API). No KV daily op limits.
 */
/** A miss this recent is trusted by putTextIfChanged, so it does not match() the same key twice. */
const RECENT_MISS_MS = 30_000;
const MAX_RECENT_MISSES = 256;

export class ResponseCache {
  private recentMisses = new Map<string, number>();

  private noteMiss(key: string): void {
    this.recentMisses.delete(key);
    this.recentMisses.set(key, Date.now());
    while (this.recentMisses.size > MAX_RECENT_MISSES) {
      const oldest = this.recentMisses.keys().next().value;
      if (oldest === undefined) break;
      this.recentMisses.delete(oldest);
    }
  }

  private missedRecently(key: string): boolean {
    const at = this.recentMisses.get(key);
    return at !== undefined && Date.now() - at < RECENT_MISS_MS;
  }

  async get(key: string, type: ResponseCacheGetType = 'text'): Promise<string | ArrayBuffer | unknown | null> {
    try {
      meterSubrequest('cache');
      const res = await caches.default.match(cacheUrl(key));
      if (!res) {
        this.noteMiss(key);
        return null;
      }
      this.recentMisses.delete(key);
      const body = res.clone();
      if (type === 'arrayBuffer') return await body.arrayBuffer();
      if (type === 'json') return await body.json();
      return await body.text();
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'response_cache_get_failed',
          key,
          message: (err as Error).message,
        })
      );
      return null;
    }
  }

  async put(
    key: string,
    body: string | ArrayBuffer,
    ttlSeconds: number,
    contentType = 'application/json'
  ): Promise<void> {
    try {
      const res = new Response(body, {
        headers: {
          'Cache-Control': `public, max-age=${ttlSeconds}`,
          'Content-Type': contentType,
        },
      });
      meterSubrequest('cache');
      await caches.default.put(cacheUrl(key), res);
      this.recentMisses.delete(key);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'response_cache_put_failed',
          key,
          message: (err as Error).message,
        })
      );
    }
  }

  /** Skip put when serialized body matches cached entry (saves Cache API writes too). */
  async putTextIfChanged(key: string, body: string, ttlSeconds: number): Promise<boolean> {
    if (this.missedRecently(key)) {
      await this.put(key, body, ttlSeconds);
      return true;
    }
    const prev = await this.get(key, 'text');
    if (prev === body) return false;
    await this.put(key, body, ttlSeconds);
    return true;
  }

  async putJsonIfChanged(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    return this.putTextIfChanged(key, JSON.stringify(value), ttlSeconds);
  }
}
