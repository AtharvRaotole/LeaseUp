import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ProspectingService } from '../services/prospecting';
import { getStoreBrandIds } from '@leaseup/fixtures';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';

/**
 * Workers Free allows 50 subrequests per invocation, and Cache API calls share that quota
 * with fetch(). Production deploy42 ran out before the gpt-4o-mini review and outreach drafts
 * ("Too many subrequests"). This keeps a live prospecting run, model calls excluded, well under
 * the cap so the planner, the review and three drafts still fit.
 */
const store = new Map<string, string>();
function db(): D1Database {
  return {
    prepare: (sql: string) => {
      const stmt = {
        binds: [] as unknown[],
        bind(...args: unknown[]) {
          this.binds = args;
          return this;
        },
        async run() {
          if (sql.includes('prospecting_jobs')) store.set(String(this.binds[0]), String(this.binds[1]));
          return { meta: { changes: 1 } };
        },
        async first() {
          if (sql.includes('prospecting_jobs')) {
            const payload = store.get(String(this.binds[0]));
            return payload ? { payload } : null;
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live prospecting subrequest budget (Workers Free: 50 per invocation)', () => {
  it('leaves room for the gpt-4o-mini planner, review and drafts', async () => {
    ensureWorkerGeotiles(join(__dirname, '../../../../'));
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../../../../data/research/round2/neigh_test_10km.json'), 'utf8')
    ).raw['Wicker Park, Chicago'] as Array<[string, number]>;
    const ids = getStoreBrandIds();
    const entities = raw.map(([name, affinity], i) => ({
      entity_id: ids[i],
      name,
      query: { affinity, affinity_rank: affinity },
    }));

    const counts = { fetch: 0, openai: 0, cache: 0, assets: 0 };
    const edge = new Map<string, Response>();
    vi.stubGlobal('caches', {
      default: {
        match: async (r: Request | string) => {
          counts.cache += 1;
          return edge.get(typeof r === 'string' ? r : r.url)?.clone();
        },
        put: async (r: Request | string, res: Response) => {
          counts.cache += 1;
          edge.set(typeof r === 'string' ? r : r.url, res);
        },
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL) => {
        const url = String(u instanceof Request ? u.url : u);
        if (url.includes('api.openai.com')) {
          counts.openai += 1;
          return new Response('unavailable in test', { status: 503 });
        }
        counts.fetch += 1;
        if (url.includes('openstreetmap.org')) {
          return new Response(
            JSON.stringify([
              {
                lat: '41.9088',
                lon: '-87.6776',
                display_name: 'Wicker Park, Chicago',
                address: { neighbourhood: 'Wicker Park', city: 'Chicago' },
              },
            ])
          );
        }
        if (url.includes('/v2/insights')) {
          return new Response(JSON.stringify({ results: { entities } }));
        }
        return new Response('{}', { status: 503 });
      })
    );
    const demoAssets = createDemoPublicAssetsFetcher();
    const assets = {
      fetch: async (u: string) => {
        counts.assets += 1;
        return demoAssets.fetch(u);
      },
    } as unknown as Fetcher;
    const env = offlineLiveAnalyzeEnv(assets, {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);
    env.DB = db();

    const service = new ProspectingService(env);
    const created = await service.create({
      address: '1574 N Milwaukee Ave, Chicago, IL 60622',
      radius: 10,
    });
    const job = await service.run(created.id, 'ip-hash');
    expect(job.status).toBe('complete');

    const beforeModel = counts.fetch + counts.cache + counts.assets;
    console.log(JSON.stringify({ liveProspectingSubrequests: { ...counts, beforeModel } }));
    // Was 74 (tiles went through the Cache API three times each). Planner (up to 6 turns),
    // review (up to 2) and drafts (3) need at most 11 more.
    expect(beforeModel).toBeLessThanOrEqual(39);
    expect(beforeModel + 11).toBeLessThan(50);
  }, 120_000);
});
