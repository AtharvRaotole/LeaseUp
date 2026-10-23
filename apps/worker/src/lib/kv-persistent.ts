import type { KVNamespace } from '@cloudflare/workers-types';

export type KvOpCounters = {
  gets: number;
  puts: number;
  skippedUnchanged: number;
};

export class PersistentKv {
  readonly counters: KvOpCounters;
  private readonly kv: KVNamespace;

  constructor(kv: KVNamespace, counters?: KvOpCounters) {
    this.kv = kv;
    this.counters = counters ?? { gets: 0, puts: 0, skippedUnchanged: 0 };
  }

  async get(
    key: string,
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream'
  ): Promise<string | ArrayBuffer | ReadableStream | unknown | null> {
    this.counters.gets += 1;
    try {
      if (type === 'json') return await this.kv.get(key, 'json');
      if (type === 'arrayBuffer') return await this.kv.get(key, 'arrayBuffer');
      if (type === 'stream') return await this.kv.get(key, 'stream');
      return await this.kv.get(key, 'text');
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'kv_get_failed',
          key,
          message: (err as Error).message,
        })
      );
      return null;
    }
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expirationTtl?: number }
  ): Promise<void> {
    try {
      if (typeof value === 'string') {
        const existing = await this.kv.get(key, 'text');
        if (existing === value) {
          this.counters.skippedUnchanged += 1;
          return;
        }
      }
      this.counters.puts += 1;
      await this.kv.put(key, value, options);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'kv_put_failed',
          key,
          message: (err as Error).message,
        })
      );
    }
  }
}

export const SHARE_PERSIST_UNAVAILABLE =
  'We could not save that link right now. Try again in a moment.';
