import { describe, it, expect, vi, afterEach } from 'vitest';
import { ResponseCache } from '../lib/response-cache';

describe('ResponseCache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('putTextIfChanged skips identical bodies', async () => {
    const store = new Map<string, Response>();
    let puts = 0;
    vi.stubGlobal('caches', {
      default: {
        match: async (req: Request | string) => {
          const url = typeof req === 'string' ? req : req.url;
          return store.get(url);
        },
        put: async (req: Request | string, res: Response) => {
          puts += 1;
          const url = typeof req === 'string' ? req : req.url;
          store.set(url, res);
        },
      },
    });

    const cache = new ResponseCache();
    await cache.putTextIfChanged('k1', '{"a":1}', 60);
    await cache.putTextIfChanged('k1', '{"a":1}', 60);
    expect(puts).toBe(1);
  });
});
