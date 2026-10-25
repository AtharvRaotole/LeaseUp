import type { Location } from '@leaseup/contracts';
import {
  boulderFixture,
  demoFixtureStratum,
  matchDemoFixtureId,
  seviervilleFixture,
  wickerparkFixture,
} from '@leaseup/fixtures/worker';
import { DemoModeRequiredError } from './demo-mode';
import type { Env } from '../index';
import type { QlooClient, QlooInsight, QlooLocation } from '../providers/qloo';
import { reconcileNearestStoreKm } from './nearest-store-reconcile';
import { displayBrandName } from './brand-display';
import { buildChainSizeInsightsFromCatalog } from './qloo-chain-fallback';
import { loadTradeAreaTasteForProspect } from './trade-area-taste';
import { NearbyPresenceCache } from './nearby-presence-cache';
import { createStoreCatalog } from '../services/store-catalog';
import type { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';
import { OsmSnapshotCatalog as OsmCatalogClass } from '../services/osm-snapshot-catalog';
import { getResponseCache } from './worker-cache';
import type { ProspectingAgentAccumulatedState } from './prospecting-agent-state';

export const PROSPECTING_AGENT_TOOL_NAMES = [
  'qloo_brand_insights',
  'store_presence_lookup',
  'nearest_store_check',
  'chain_size_fallback',
  'enrich_site_stratum',
] as const;

export type ProspectingAgentToolName = (typeof PROSPECTING_AGENT_TOOL_NAMES)[number];

export type ProspectingAgentToolCall = {
  name: ProspectingAgentToolName;
  reason: string;
  arguments: Record<string, unknown>;
};

export type ProspectingAgentToolResult = {
  summary: string;
  /** Longer result sent back to the model planner (defaults to summary). */
  observation?: string;
  qlooCalls: number;
  payload?: Record<string, unknown>;
};

export function isProspectingAgentEntityId(entityId: string): boolean {
  const trimmed = entityId.trim();
  if (!trimmed) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    trimmed
  );
}

function normalizeBrandKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

export type AgentEntityResolution =
  | { ok: true; entityId: string; resolvedFromName?: string }
  | { ok: false; reason: 'missing' | 'not_in_panel'; asked?: string };

/**
 * The model sometimes passes a brand name instead of the panel id. Resolve it against the
 * fetched Qloo panel; never guess outside it.
 */
export function resolveAgentEntityId(
  raw: unknown,
  insights?: QlooInsight[]
): AgentEntityResolution {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, reason: 'missing' };
  if (isProspectingAgentEntityId(value)) return { ok: true, entityId: value };
  const key = normalizeBrandKey(value);
  const row = key
    ? insights?.find(
        (i) =>
          normalizeBrandKey(i.name ?? '') === key ||
          normalizeBrandKey(displayBrandName(i.entity_id, i.name)) === key
      )
    : undefined;
  if (row && isProspectingAgentEntityId(row.entity_id)) {
    return { ok: true, entityId: row.entity_id, resolvedFromName: value };
  }
  return { ok: false, reason: 'not_in_panel', asked: value.slice(0, 60) };
}

function unresolvedSummary(res: Extract<AgentEntityResolution, { ok: false }>): string {
  return res.reason === 'not_in_panel'
    ? `Not checked: ${res.asked} is not in the fetched Qloo panel.`
    : 'Not checked (missing brand id).';
}

const UNRESOLVED_OBSERVATION =
  'Not checked. Pass an entityId from topByAffinity in the qloo_brand_insights result.';

/** Display name for a brand id from the fetched panel (never a bare id in receipt text). */
export function agentBrandName(entityId: string, insights?: QlooInsight[]): string {
  const row = insights?.find((i) => i.entity_id === entityId);
  return row ? displayBrandName(entityId, row.name) : 'the selected brand';
}

/** Top of the fetched panel so the model can pick real brand ids for follow-up checks. */
export function panelObservation(rows: QlooInsight[], limit = 12): string {
  const top = [...rows]
    .sort((a, b) => (a.query?.affinity_rank ?? 9999) - (b.query?.affinity_rank ?? 9999))
    .slice(0, limit)
    .map((r) => ({
      entityId: r.entity_id,
      name: displayBrandName(r.entity_id, r.name),
      affinityRank: r.query?.affinity_rank,
    }));
  return JSON.stringify({ brandCount: rows.length, topByAffinity: top });
}

export type ProspectingAgentToolContext = {
  env: Env;
  location: Location;
  radiusKm: number;
  runId: string;
  qloo: QlooClient;
  mode: 'live' | 'demo';
  /** Last insights from qloo_brand_insights or chain_size_fallback (for planner context). */
  lastInsights?: QlooInsight[];
  state: ProspectingAgentAccumulatedState;
};

function buildQlooLocation(
  location: Location,
  radiusKm: number,
  mode: 'live' | 'demo'
): QlooLocation {
  if (mode === 'demo') {
    const fixtureId = matchDemoFixtureId(location.address);
    if (!fixtureId) {
      throw new DemoModeRequiredError();
    }
    const fixture =
      fixtureId === 'wicker'
        ? wickerparkFixture
        : fixtureId === 'boulder'
          ? boulderFixture
          : seviervilleFixture;
    return { kind: 'query', query: fixture.location.name };
  }
  return {
    kind: 'point',
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
  };
}

export async function executeProspectingAgentTool(
  call: ProspectingAgentToolCall,
  ctx: ProspectingAgentToolContext
): Promise<ProspectingAgentToolResult> {
  const catalog = createStoreCatalog(ctx.env, ctx.mode);
  const presence = new NearbyPresenceCache(catalog, ctx.location);
  const osmSnapshot: OsmSnapshotCatalog | undefined = ctx.env.ASSETS
    ? new OsmCatalogClass(ctx.env.ASSETS, getResponseCache())
    : undefined;

  switch (call.name) {
    case 'qloo_brand_insights': {
      const take = Math.min(50, Math.max(10, Number(call.arguments.take) || 50));
      const rows = await ctx.qloo.getBrandInsights({
        location: buildQlooLocation(ctx.location, ctx.radiusKm, ctx.mode),
        brandIds: catalog.getBrandIds(),
        take,
        runId: ctx.runId,
      });
      ctx.lastInsights = rows;
      ctx.state.insights = rows;
      return {
        summary: `Qloo returned ${rows.length} brand insights (take=${take}).`,
        observation: panelObservation(rows),
        qlooCalls: 1,
        payload: { brandCount: rows.length, topEntityId: rows[0]?.entity_id },
      };
    }
    case 'store_presence_lookup': {
      const radiusKm = Number(call.arguments.radiusKm) || ctx.radiusKm;
      const resolved = resolveAgentEntityId(call.arguments.entityId, ctx.lastInsights);
      if (!resolved.ok) {
        return {
          summary: unresolvedSummary(resolved),
          observation: UNRESOLVED_OBSERVATION,
          qlooCalls: 0,
          payload: { asked: resolved.asked, checked: false, radiusKm, reason: resolved.reason },
        };
      }
      const entityId = resolved.entityId;
      const nearby = await presence.storesNearby(entityId, radiusKm);
      return {
        summary: nearby.length
          ? `${nearby.length} store(s) within ${radiusKm} km; nearest ${nearby[0]!.distance.toFixed(2)} km.`
          : `No stores within ${radiusKm} km.`,
        qlooCalls: 0,
        payload: {
          entityId,
          checked: true,
          count: nearby.length,
          nearestKm: nearby[0]?.distance,
          radiusKm,
        },
      };
    }
    case 'nearest_store_check': {
      const resolved = resolveAgentEntityId(call.arguments.entityId, ctx.lastInsights);
      if (!resolved.ok) {
        return {
          summary: unresolvedSummary(resolved),
          observation: UNRESOLVED_OBSERVATION,
          qlooCalls: 0,
          payload: { asked: resolved.asked, checked: false, reason: resolved.reason },
        };
      }
      const entityId = resolved.entityId;
      const reconciled = await reconcileNearestStoreKm(
        entityId,
        ctx.location,
        presence,
        osmSnapshot
      );
      const km = reconciled.km;
      const brandName = agentBrandName(entityId, ctx.lastInsights);
      const summary =
        km === undefined
          ? `No nearest ${brandName} store found in ATP/OSM scan.`
          : `Nearest ${brandName} store ${km.toFixed(2)} km${reconciled.unconfirmed ? ' (ATP/OSM disagree)' : ''}.`;
      return {
        summary,
        qlooCalls: 0,
        payload: { entityId, checked: true, km, unconfirmed: reconciled.unconfirmed },
      };
    }
    case 'chain_size_fallback': {
      const rows = buildChainSizeInsightsFromCatalog(catalog);
      ctx.lastInsights = rows;
      ctx.state.insights = rows;
      ctx.state.forceChainSizeRanking = true;
      return {
        summary: `Chain-size fallback panel: ${rows.length} brands ordered by national store count.`,
        qlooCalls: 0,
        payload: { brandCount: rows.length },
      };
    }
    case 'enrich_site_stratum': {
      const fixtureId = matchDemoFixtureId(ctx.location.address);
      const stratum = fixtureId ? demoFixtureStratum(fixtureId) : 'urban';
      const entityId = call.arguments.entityId
        ? String(call.arguments.entityId)
        : ctx.lastInsights?.[0]?.entity_id;
      if (!entityId) {
        return {
          summary: `Site stratum ${stratum}; no brand selected for trade-area enrichment.`,
          qlooCalls: 0,
          payload: { stratum },
        };
      }
      const taste = await loadTradeAreaTasteForProspect(
        ctx.qloo,
        ctx.location,
        entityId,
        ctx.radiusKm,
        ctx.runId,
        ctx.env.ASSETS
      );
      const audienceCount = taste?.audiences?.length ?? 0;
      const usedQloo = !fixtureId && audienceCount > 0;
      const brandName = agentBrandName(entityId, ctx.lastInsights);
      // Only verified overlap earns a ranking boost; a check that finds nothing changes nothing.
      if (taste && audienceCount > 0) {
        ctx.state.stratumBoostEntityIds.add(entityId);
        ctx.state.preloadedTradeAreaTaste.set(entityId, taste);
      }
      return {
        summary: audienceCount
          ? `Stratum ${stratum}: ${audienceCount} verified local audience overlap(s) for ${brandName}.`
          : `Stratum ${stratum}: no verified trade-area taste overlap for ${brandName}; ranking unchanged.`,
        qlooCalls: usedQloo ? 1 : 0,
        payload: { stratum, entityId, audienceCount, tradeAreaTaste: taste },
      };
    }
    default:
      return { summary: `Unknown tool ${call.name}`, qlooCalls: 0 };
  }
}

export const PROSPECTING_AGENT_OPENAI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'qloo_brand_insights',
      description: 'Fetch Qloo brand insights and affinity for the site panel.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this call is needed now.' },
          take: { type: 'number', description: 'Max brands to return (10-50).' },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'store_presence_lookup',
      description: 'Check All The Places store presence within a radius for one brand.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          entityId: { type: 'string' },
          radiusKm: { type: 'number' },
        },
        required: ['reason', 'entityId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'nearest_store_check',
      description: 'Reconcile nearest store distance using ATP and OSM snapshot.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          entityId: { type: 'string' },
        },
        required: ['reason', 'entityId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'chain_size_fallback',
      description: 'Use chain-size ranking when Qloo taste is unavailable or thin.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'enrich_site_stratum',
      description: 'Load trade-area taste enrichment for the site stratum (optional brand).',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          entityId: { type: 'string' },
        },
        required: ['reason'],
      },
    },
  },
];
