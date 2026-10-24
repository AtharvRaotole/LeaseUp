const CACHE_ORIGIN = 'https://leaseup-edge-cache.internal';

export type ResponseCacheGetType = 'text' | 'json' | 'arrayBuffer';

function cacheUrl(key: string): string {
  return `${CACHE_ORIGIN}/${encodeURIComponent(key)}`;
}

/**
 * Ephemeral HTTP response cache (Workers Cache API). No KV daily op limits.
 */
export class ResponseCache {
  async get(key: string, type: ResponseCacheGetType = 'text'): Promise<string | ArrayBuffer | unknown | null> {
    try {
      const res = await caches.default.match(cacheUrl(key));
      if (!res) return null;
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
      await caches.default.put(cacheUrl(key), res);
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
    const prev = await this.get(key, 'text');
    if (prev === body) return false;
    await this.put(key, body, ttlSeconds);
    return true;
  }

  async putJsonIfChanged(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    return this.putTextIfChanged(key, JSON.stringify(value), ttlSeconds);
  }
}
