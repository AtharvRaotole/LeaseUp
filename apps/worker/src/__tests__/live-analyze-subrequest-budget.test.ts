import { afterEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { analysisRouter } from '../routes/analysis';
import { handleLiveOffload } from '../services/live-offload-handler';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';

/**
 * Workers Free allows 50 subrequests per invocation. Prospecting runs were metered and budget
 * tested from deploy44; this covers POST /api/analyze/stream on a live address that is not a
 * demo chip, including the inline OSM verification and the background OSM warmup, both with
 * the loopback offload binding (production) and without it (everything in one invocation).
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

interface Reported {
  fetch: number;
  cache: number;
  assets: number;
  loopback: number;
  total: number;
  offloads?: Array<{ op: string; ok: boolean; total?: number }>;
}

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

async function runStream(withOffload: boolean) {
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
  const counts = { fetch: 0, openai: 0, overpass: 0, cache: 0, assets: 0, offloadCalls: 0 };
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
  const LiveOffload = {
    fetch: async (url: string, init?: RequestInit) => {
      counts.offloadCalls += 1;
      return handleLiveOffload(new Request(url, init), env);
    },
  } as unknown as Fetcher;
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (p: Promise<unknown>) => pending.push(p),
    passThroughOnException: () => undefined,
    ...(withOffload ? { exports: { LiveOffload } } : {}),
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
  const list = events(await res.text());
  await Promise.all(pending);
  const names = list.map((e) => e.event);
  expect(names).toContain('complete');
  expect(names).not.toContain('error');
  expect(names[names.length - 1]).toBe('subrequests');
  const reported = list[list.length - 1]!.data as Reported;
  const complete = list.find((e) => e.event === 'complete')!.data as {
    prospects: Array<{ tradeAreaTaste?: { audiences: unknown[] } }>;
  };
  return { counts, reported, complete, total: counts.fetch + counts.cache + counts.assets };
}

describe('live analyze stream subrequest budget (Workers Free: 50 per invocation)', () => {
  it('stays under the cap inline and reports its own count', async () => {
    const { counts, reported, total } = await runStream(false);
    console.log(JSON.stringify({ inline: { ...counts, total, reported } }));
    expect(counts.offloadCalls).toBe(0);
    expect(reported.loopback).toBe(0);
    // The route meter sees everything except the waitUntil warmup, which runs after its snapshot.
    expect(reported.total).toBeGreaterThan(0);
    expect(reported.total).toBeLessThanOrEqual(total);
    expect(total).toBeLessThanOrEqual(45);
  }, 120_000);

  it('uses the loopback offload in production, like prospecting runs', async () => {
    // Offloaded first, so any warm in memory cache favors the inline run it is compared with.
    const { counts, reported, complete } = await runStream(true);
    const inline = await runStream(false);
    console.log(JSON.stringify({ offloaded: { ...counts, reported }, inlineAfter: inline.reported }));
    expect(counts.offloadCalls).toBeGreaterThan(0);
    expect(reported.loopback).toBe(counts.offloadCalls);
    expect(reported.offloads?.length).toBe(counts.offloadCalls);
    expect(reported.offloads?.every((o) => o.ok)).toBe(true);
    // Each offloaded invocation has its own 50; the caller spends one per call instead.
    for (const o of reported.offloads ?? []) expect(o.total ?? 0).toBeLessThanOrEqual(40);
    expect(reported.total).toBeLessThan(inline.reported.total);
    // Same report either way: offloading moves the work, it does not drop it.
    const inlineTaste = inline.complete.prospects.map((p) => p.tradeAreaTaste?.audiences.length ?? 0);
    expect(complete.prospects.map((p) => p.tradeAreaTaste?.audiences.length ?? 0)).toEqual(inlineTaste);
  }, 120_000);
});
