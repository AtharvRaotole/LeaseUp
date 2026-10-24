import type { Env } from '../index';
import { ResponseCache } from './response-cache';
import { PersistentKv, type KvOpCounters } from './kv-persistent';

let sharedResponseCache: ResponseCache | null = null;

export function getResponseCache(): ResponseCache {
  if (!sharedResponseCache) sharedResponseCache = new ResponseCache();
  return sharedResponseCache;
}

export function getPersistentKv(env: Env, counters?: KvOpCounters): PersistentKv {
  const existing = (env as Env & { __persistentKv?: PersistentKv }).__persistentKv;
  if (existing && (!counters || existing.counters === counters)) return existing;
  const wrapped = new PersistentKv(env.CACHE, counters);
  (env as Env & { __persistentKv?: PersistentKv }).__persistentKv = wrapped;
  return wrapped;
}
