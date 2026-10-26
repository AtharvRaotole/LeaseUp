import { afterEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { analysisRouter } from '../routes/analysis';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';

/**
 * Workers Free allows 50 subrequests per invocation. Prospecting runs were metered and budget
 * tested from deploy44; this covers POST /api/analyze/stream on a live address that is not a demo chip, with
 * no offload binding (everything in one invocation, the worst case), including the inline OSM
 * verification and the background OSM warmup.
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

function events(body: string): Array<{ event: string; data: unknown }> {
  return body
    .split('\n\n')
    .filter((part) => part.startsWith('event: '))
    .map((part) => {
      const [head, ...rest] = part.split('\n');
      const data = rest.find((l) => l.startsWith('data: '))?.slice(6) ?? 'null';
      return { event: head!.slice(7), data: JSON.parse(data) as unknown };
    });
}

describe('live analyze stream subrequest budget (Workers Free: 50 per invocation)', () => {
  it('stays under the cap and reports its own count', async () => {
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
    const counts = { fetch: 0, openai: 0, overpass: 0, cache: 0, assets: 0 };
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
        counts.fetch += 1;
        if (url.includes('api.openai.com')) {
          counts.openai += 1;
          return new Response('unavailable in test', { status: 503 });
        }
        if (url.includes('overpass')) {
          counts.overpass += 1;
          return new Response(JSON.stringify({ elements: [] }));
        }
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
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      passThroughOnException: () => undefined,
    } as unknown as ExecutionContext;

    const res = await analysisRouter.request(
      '/analyze/stream',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: '1600 W Chicago Ave, Chicago, IL 60622', radius: 10 }),
      },
      env,
      ctx
    );
    const body0 = await res.text();
    const list = events(body0);
    await Promise.all(pending);
    const names = list.map((e) => e.event);
    expect(names).toContain('complete');
    expect(names).not.toContain('error');
    expect(names[names.length - 1]).toBe('subrequests');
    const reported = list[list.length - 1]!.data as { total: number; fetch: number; cache: number; assets: number };

    const total = counts.fetch + counts.cache + counts.assets;
    console.log(JSON.stringify({ liveAnalyzeSubrequests: { ...counts, total, reported } }));
    // The route meter sees everything except the waitUntil warmup, which runs after its snapshot.
    expect(reported.total).toBeLessThanOrEqual(total);
    expect(reported.total).toBeGreaterThan(0);
    // Whole invocation, warmup and the gpt-4o-mini calls included, with headroom under 50.
    expect(total).toBeLessThanOrEqual(45);
  }, 120_000);
});
