import type { NearbyTenant, ProspectPack } from '@leaseup/contracts';
import type { Env } from '../index';
import { AnalysisService } from './analysis';
import { QlooClient } from '../providers/qloo';
import { getResponseCache } from '../lib/worker-cache';
import { lookupTradeAreaTasteForProspect } from '../lib/trade-area-taste';
import { enrichProspectsWithCoTenancy } from '../lib/co-tenancy-enrich';
import {
  createProspectingReviewClient,
  runProspectingAgentReview,
  type ProspectingReviewResult,
} from '../lib/prospecting-agent-review';
import { displayBrandName } from '../lib/brand-display';
import { withSubrequestMeter } from '../lib/subrequest-meter';
import {
  LIVE_OFFLOAD_OPS,
  LIVE_OFFLOAD_ORIGIN,
  type LiveOffloadOp,
  type LiveOffloadResponse,
} from '../lib/live-offload-client';

type OffloadLocation = { latitude: number; longitude: number; address: string };

export interface TradeAreaTasteOffloadInput {
  location: OffloadLocation;
  entityIds: string[];
  radiusKm: number;
  runId?: string;
}

export type TradeAreaTasteOffloadResult = Array<{
  entityId: string;
  taste: Awaited<ReturnType<typeof lookupTradeAreaTasteForProspect>>['taste'];
  checked: boolean;
}>;

export interface CoTenancyOffloadInput {
  location: OffloadLocation;
  radiusKm: number;
  runId?: string;
  mode: 'live' | 'demo';
  nearbyTenants: NearbyTenant[];
  prospects: ProspectPack[];
  tasteUnavailable: boolean;
}

export interface ReviewDraftsInput {
  prospects: ProspectPack[];
  neighborhood?: string;
  address: string;
  runId: string;
}

export interface ReviewDraftsResult {
  prospects: ProspectPack[];
  review: ProspectingReviewResult;
  drafts: Array<{ draft: string; model: string }>;
}

/** Gpt-4o-mini review of the shortlist, then one batched call for the top 3 outreach drafts. */
export async function runReviewAndDrafts(
  env: Env,
  input: ReviewDraftsInput
): Promise<ReviewDraftsResult> {
  const reviewed = await runProspectingAgentReview({
    prospects: input.prospects,
    client: createProspectingReviewClient(env),
    neighborhood: input.neighborhood,
  });
  const draftPacks = reviewed.prospects.slice(0, 3);
  const drafts = await new AnalysisService(env).generateOutreachForBrands(
    draftPacks.map((pack) => ({
      brandName: displayBrandName(pack.brand.entityId, pack.brand.name),
      address: input.address,
      reasons: pack.reasons,
      affinityRank: pack.brand.affinityRank,
      neighborhood: input.neighborhood,
      nearestStoreKm: pack.nearestExistingStoreKm,
    })),
    input.runId
  );
  return { prospects: reviewed.prospects, review: reviewed.review, drafts };
}

async function runOp(env: Env, op: LiveOffloadOp, body: unknown): Promise<unknown> {
  switch (op) {
    case 'trade-area-taste': {
      const input = body as TradeAreaTasteOffloadInput;
      const qloo = new QlooClient(env);
      const rows: TradeAreaTasteOffloadResult = await Promise.all(
        input.entityIds.map(async (entityId) => {
          const lookup = await lookupTradeAreaTasteForProspect(
            qloo,
            input.location,
            entityId,
            input.radiusKm,
            input.runId,
            env.ASSETS
          );
          return { entityId, taste: lookup.taste, checked: lookup.checked };
        })
      );
      return rows;
    }
    case 'co-tenancy': {
      const input = body as CoTenancyOffloadInput;
      return enrichProspectsWithCoTenancy({
        ...input,
        qloo: new QlooClient(env),
        responseCache: getResponseCache(),
        assets: env.ASSETS,
      });
    }
    case 'review-drafts':
      return runReviewAndDrafts(env, body as ReviewDraftsInput);
  }
}

function json(body: LiveOffloadResponse<unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Fetch handler behind the LiveOffload loopback export. Not routed publicly. */
export async function handleLiveOffload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const op = url.pathname.replace(/^\//, '') as LiveOffloadOp;
  if (
    request.method !== 'POST' ||
    url.origin !== LIVE_OFFLOAD_ORIGIN ||
    !LIVE_OFFLOAD_OPS.includes(op)
  ) {
    return json({ ok: false, error: 'not found' }, 404);
  }
  const body = (await request.json()) as unknown;
  try {
    const { result, counts } = await withSubrequestMeter(() => runOp(env, op, body));
    return json({ ok: true, result, counts });
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, 500);
  }
}

/** Named export so ctx.exports.LiveOffload is a loopback service binding to this Worker. */
export const LiveOffload = {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleLiveOffload(request, env);
  },
};
