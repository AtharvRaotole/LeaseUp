import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';

function installCacheApiStore() {
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', {
    default: {
      match: async (req: Request | string) => {
        const url = typeof req === 'string' ? req : req.url;
        return store.get(url) ?? undefined;
      },
      put: async (req: Request | string, res: Response) => {
        const url = typeof req === 'string' ? req : req.url;
        store.set(url, res);
      },
    },
  });
  return store;
}

describe('/api/analyze KV operations', () => {
  beforeEach(() => {
    installCacheApiStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses zero KV writes on cold and warm demo analyze', async () => {
    const kvPuts: string[] = [];
    const kvGets: string[] = [];
    const CACHE = {
      get: vi.fn(async (key: string) => {
        kvGets.push(key);
        return null;
      }),
      put: vi.fn(async (key: string) => {
        kvPuts.push(key);
      }),
    } as unknown as KVNamespace;

    const db = {
      prepare: () => {
        const stmt = {
          bind: () => stmt,
          run: async () => ({}),
          first: async () => null,
        };
        return stmt;
      },
    } as unknown as D1Database;

    const env = {
      DB: db,
      CACHE,
      APP_MODE: 'demo',
    } as import('../index').Env;

    const service = new AnalysisService(env);
    const address = '1574 N Milwaukee Ave, Chicago, IL 60622';
    const req = { address, radius: 10 };

    await service.analyze(req, 'run-cold', 'test-ip');
    expect(kvPuts.length).toBeLessThanOrEqual(1);

    await service.analyze(req, 'run-warm', 'test-ip');
    expect(kvPuts.length).toBeLessThanOrEqual(1);
    expect(kvPuts).toHaveLength(0);
  });
});
