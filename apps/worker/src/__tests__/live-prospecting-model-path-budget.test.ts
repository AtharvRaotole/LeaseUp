import { describe, it, expect, vi, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ProspectingService } from '../services/prospecting';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { clearCoAffinityMemo } from '../lib/co-tenancy-enrich';
import { handleLiveOffload } from '../services/live-offload-handler';
import { withSubrequestMeter } from '../lib/subrequest-meter';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';

/**
 * Workers Free allows 50 subrequests per invocation (fetch, Cache API and asset fetches all
 * count). deploy43 still hit "Too many subrequests" on a non-demo address, because a
 * non-fixture address runs the gpt-4o-mini planner (up to 6 calls) before the review and
 * drafts, and the per-brand audience and co-tenancy fan-out alone is about 30 more.
 * This test uses a non-demo address so the real model planner, model review and batched
 * drafts paths all run (OpenAI stubbed), with a realistic Qloo panel (distinct brands).
 * The run fans out through the ctx.exports loopback binding; each loopback call is its own
 * Worker invocation with its own budget, simulated here as a separate counted phase.
 */
const BUDGET = 45;

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
          if (sql.includes('prospecting_jobs'))
            store.set(String(this.binds[0]), String(this.binds[1]));
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

function chat(message: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { role: 'assistant', ...message }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 900, completion_tokens: 60 },
    })
  );
}

function toolCall(id: string, name: string, args: Record<string, unknown>) {
  return {
    id,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearCoAffinityMemo();
});

describe('live prospecting model path subrequest budget (non-demo address)', () => {
  it(`runs the model planner, model review and AI drafts in at most ${BUDGET} subrequests`, async () => {
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

    const emptyCounts = () => ({
      nominatim: 0,
      qloo: 0,
      otherFetch: 0,
      cache: 0,
      assets: 0,
      loopback: 0,
      openaiPlanner: 0,
      openaiReview: 0,
      openaiDrafts: 0,
      openaiWhy: 0,
      openaiOther: 0,
    });
    type Counts = ReturnType<typeof emptyCounts>;
    const phases = new Map<string, Counts>();
    const phaseStore = new AsyncLocalStorage<string>();
    const bump = (key: keyof Counts) => {
      const phase = phaseStore.getStore() ?? 'main';
      if (!phases.has(phase)) phases.set(phase, emptyCounts());
      phases.get(phase)![key] += 1;
    };
    let plannerTurns = 0;
    let reviewTurns = 0;
    let firstEligible: Array<{ comparableMarkets?: { lifted?: { panelMarketShare?: number }; displaced?: { panelMarketShare?: number } } }> = [];
    const edge = new Map<string, Response>();
    const panelSeen = new Map<string, number>();
    vi.stubGlobal('caches', {
      default: {
        match: async (r: Request | string) => {
          bump('cache');
          return edge.get(typeof r === 'string' ? r : r.url)?.clone();
        },
        put: async (r: Request | string, res: Response) => {
          bump('cache');
          edge.set(typeof r === 'string' ? r : r.url, res);
        },
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL, init?: RequestInit) => {
        const url = String(u instanceof Request ? u.url : u);
        if (url.includes('api.openai.com')) {
          const body = String(init?.body ?? '');
          const req = JSON.parse(body) as {
            messages: Array<{ role: string; content?: string }>;
          };
          if (body.includes('lift_pitch')) {
            bump('openaiReview');
            reviewTurns += 1;
            if (reviewTurns === 1) {
              const user = req.messages.find((m) => m.role === 'user');
              const eligible = (JSON.parse(user?.content ?? '{}').eligibleLifts ?? []) as Array<{
                entityId: string;
                aboveEntityId: string;
              }>;
              firstEligible = eligible as typeof firstEligible;
              return chat({
                content: null,
                tool_calls: eligible.slice(0, 1).map((e) =>
                  toolCall('rv1', 'lift_pitch', {
                    reason: 'Verified local audience overlap.',
                    entityId: e.entityId,
                    aboveEntityId: e.aboveEntityId,
                  })
                ),
              });
            }
            return chat({ content: 'Order is fine.' });
          }
          if (body.includes('one factual sentence per brand')) {
            bump('openaiWhy');
            const n = Number(/\((\d+) sections\)/.exec(body)?.[1] ?? 0);
            return chat({
              content: JSON.stringify({
                summaries: Array.from({ length: n }, () => 'Shares local Qloo audiences.'),
              }),
            });
          }
          if (body.includes('separate broker outreach emails')) {
            bump('openaiDrafts');
            const n = Number(/Write (\d+) separate/.exec(body)?.[1] ?? 0);
            const drafts = Array.from({ length: n }, (_, i) => ({
              subject: `Storefront at 240 Bedford Ave, draft ${i + 1}`,
              body: 'Your brand ranks high on local Qloo taste and has no store within the radius.',
            }));
            return chat({ content: JSON.stringify({ drafts }) });
          }
          if (body.includes('qloo_brand_insights')) {
            bump('openaiPlanner');
            plannerTurns += 1;
            const n = plannerTurns;
            if (n === 1) {
              return chat({
                content: null,
                tool_calls: [toolCall('p1', 'qloo_brand_insights', {})],
              });
            }
            if (n <= 5) {
              return chat({
                content: null,
                tool_calls: [
                  toolCall(`p${n}`, 'nearest_store_check', {
                    entityId: ids[n - 2],
                  }),
                ],
              });
            }
            return chat({ content: 'done' });
          }
          bump('openaiOther');
          console.log('OTHER_OPENAI', body.slice(0, 300));
          return new Response('unexpected model call', { status: 503 });
        }
        if (url.includes('nominatim') || url.includes('openstreetmap.org')) {
          bump('nominatim');
          return new Response(
            JSON.stringify([
              {
                lat: '40.7178',
                lon: '-73.9576',
                display_name: '240 Bedford Avenue, Williamsburg, Brooklyn, New York, 11249',
                address: {
                  house_number: '240',
                  road: 'Bedford Avenue',
                  suburb: 'Brooklyn',
                  city: 'New York',
                  state: 'New York',
                  country_code: 'us',
                },
              },
            ])
          );
        }
        if (url.includes('/v2/insights') || url.includes('qloo')) {
          bump('qloo');
          const params = new URL(url).searchParams;
          if (params.get('filter.type') === 'urn:audience') {
            // Location audiences A1..A10; about half the brands share them (verified overlap),
            // the rest index on other audiences (checked, none), so the review has a real choice.
            const brand = params.get('signal.interests.entities');
            let h = 7;
            for (const ch of brand ?? '') h = (h * 31 + ch.charCodeAt(0)) % 9973;
            const prefix = !brand || h % 2 === 0 ? 'a' : 'b';
            const rows = Array.from({ length: 10 }, (_, i) => ({
              entity_id: `urn:audience:test:${prefix}${i + 1}`,
              name: `Test audience ${prefix.toUpperCase()}${i + 1}`,
              query: { affinity: (brand ? 0.8 : 0.9) - i * 0.01 },
            }));
            return new Response(JSON.stringify({ results: { entities: rows } }));
          }
          // Realistic panel: each batch returns only the brands it asked for, so the
          // shortlist holds distinct brands (per-brand fan-out shows up in the count).
          const asked = new URL(url).searchParams.get('filter.results.entities');
          if (asked) {
            const rows = asked.split(',').map((id) => {
              const known = entities.find((e) => e.entity_id === id);
              if (known) return known;
              const i = (panelSeen.get(id) ?? panelSeen.set(id, panelSeen.size).get(id))!;
              let h = 7;
              for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
              const affinity = 0.2 + (h % 700) / 1000;
              return {
                entity_id: id,
                name: `Brand ${i + 1}`,
                query: { affinity, affinity_rank: affinity },
              };
            });
            rows.sort((a, b) => b.query.affinity - a.query.affinity);
            return new Response(JSON.stringify({ results: { entities: rows } }));
          }
          return new Response(JSON.stringify({ results: { entities: [], tags: [] } }));
        }
        bump('otherFetch');
        return new Response('{}', { status: 503 });
      })
    );
    const demoAssets = createDemoPublicAssetsFetcher();
    const assets = {
      fetch: async (u: string) => {
        bump('assets');
        return demoAssets.fetch(u);
      },
    } as unknown as Fetcher;
    const env = offlineLiveAnalyzeEnv(assets, {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);
    env.DB = db();

    // Loopback binding: every call is a fresh invocation (own phase, own budget).
    env.LIVE_OFFLOAD = {
      fetch: async (url: string, init?: RequestInit) => {
        bump('loopback');
        const op = new URL(url).pathname.slice(1);
        return phaseStore.run(`offload:${op}`, () =>
          handleLiveOffload(new Request(url, init), env)
        );
      },
    } as unknown as Fetcher;

    const service = new ProspectingService(env);
    // POST /prospecting (geocode) is its own HTTP request, so its own invocation.
    const created = await phaseStore.run('create', () =>
      service.create({
        address: '240 Bedford Ave, Brooklyn, NY 11249',
        radius: 10,
      })
    );
    const { result: job } = await withSubrequestMeter(() => service.run(created.id, 'ip-hash'));
    expect(job.status).toBe('complete');

    const planStep = job.steps.find((s) => s.id === 'agent_plan');
    const detail = planStep?.detail as
      | {
          review?: Record<string, unknown>;
          subrequests?: {
            total: number;
            offloads?: Array<{ op: string; ok: boolean; total?: number }>;
          };
        }
      | undefined;
    const review = detail?.review;
    const totals = new Map<string, number>();
    for (const [phase, c] of phases) {
      totals.set(
        phase,
        Object.values(c).reduce((a, b) => a + b, 0)
      );
    }
    const sum = (key: keyof Counts) => [...phases.values()].reduce((a, c) => a + c[key], 0);
    console.log(
      JSON.stringify({
        liveModelPathSubrequests: Object.fromEntries(
          [...phases].map(([phase, c]) => [phase, { ...c, total: totals.get(phase) }])
        ),
        recordedMeter: detail?.subrequests,
        review: {
          planner: review?.planner,
          fallbackReason: review?.fallbackReason,
        },
        drafts: job.outreachDrafts?.map((d) => d.model),
      })
    );

    // The model paths really ran (no demo planner, no fallback).
    expect(sum('openaiPlanner')).toBeGreaterThan(1);
    expect(review?.planner).toBe('model');
    expect(review?.fallbackReason).toBeUndefined();
    expect(review?.eligibleLifts).toBeGreaterThan(0);
    // The run location reaches the offloaded review, so every lift carries panel market shares.
    expect(firstEligible.length).toBeGreaterThan(0);
    expect(firstEligible.every((e) => typeof e.comparableMarkets?.lifted?.panelMarketShare === 'number')).toBe(true);
    expect(firstEligible.every((e) => typeof e.comparableMarkets?.displaced?.panelMarketShare === 'number')).toBe(true);
    expect((review?.actions as Array<{ outcome: string }>).some((a) => a.outcome === 'lifted')).toBe(true);
    expect(sum('openaiDrafts')).toBe(1);
    expect(job.outreachDrafts).toHaveLength(3);
    for (const d of job.outreachDrafts ?? []) expect(d.model).toBe('gpt-4o-mini');
    expect(sum('openaiWhy')).toBeLessThanOrEqual(1);
    expect(sum('openaiOther')).toBe(0);
    expect(sum('otherFetch')).toBe(0);

    // The fan-out really went through the loopback, in separate invocations.
    expect([...phases.keys()].sort()).toEqual([
      'create',
      'main',
      'offload:co-tenancy',
      'offload:review-drafts',
      'offload:trade-area-taste',
    ]);
    expect(phases.get('offload:review-drafts')!.openaiReview).toBeGreaterThan(0);
    expect(phases.get('offload:review-drafts')!.openaiDrafts).toBe(1);

    // Every invocation stays at or under the budget (Workers Free cap is 50).
    for (const [phase, total] of totals) {
      expect(total, phase).toBeLessThanOrEqual(BUDGET);
    }

    // The production meter recorded in the job agrees with this independent count.
    expect(detail?.subrequests?.total).toBe(totals.get('main'));
    const recorded = new Map((detail?.subrequests?.offloads ?? []).map((o) => [o.op, o]));
    for (const op of ['trade-area-taste', 'co-tenancy', 'review-drafts']) {
      expect(recorded.get(op)?.ok, op).toBe(true);
      expect(recorded.get(op)?.total, op).toBe(totals.get(`offload:${op}`));
    }
  }, 120_000);
});
