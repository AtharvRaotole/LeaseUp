import type { Location } from '@leaseup/contracts';
import {
  DEMO_LOGISTIC_SITE_CONTEXT,
  chainSizeTierFromStoreCount,
  defaultLogisticSiteContext,
  demoFixtureDensity,
  demoFixtureStratum,
  densityToDefaultStratum,
  getNationalStoreCount,
  isProspectChainTier,
  matchDemoFixtureId,
  orderInsightsByLogisticBlend,
  prospectAbsenceRadiusKm,
} from '@leaseup/fixtures/worker';
import { affinityThresholdAtPercentile, isProspectCandidate } from './prospect-filter';
import { formatFitsStorefront } from './storefront-format';
import { chainRankedInsights } from './qloo-chain-fallback';
import type { StoreCatalog } from '../services/store-catalog';
import { NearbyPresenceCache } from './nearby-presence-cache';
import type { ProspectingAgentDagHooks } from './prospecting-agent-state';
import type { QlooInsight } from '../providers/qloo';

export async function shortlistProspectEntityIds(params: {
  location: Location;
  insights: QlooInsight[];
  radiusKm: number;
  catalog: StoreCatalog;
  storefrontSqFt?: number;
  tasteUnavailable?: boolean;
  agentDagHooks?: ProspectingAgentDagHooks;
  limit: number;
}): Promise<string[]> {
  const sqFt = params.storefrontSqFt ?? 2_500;
  const fixtureId = matchDemoFixtureId(params.location.address);
  const siteDensity = fixtureId ? demoFixtureDensity(fixtureId) : 'urban';
  const siteStratum = fixtureId ? demoFixtureStratum(fixtureId) : densityToDefaultStratum(siteDensity);
  const absenceRadiusKm = prospectAbsenceRadiusKm(siteStratum, params.radiusKm);
  const presence = new NearbyPresenceCache(params.catalog, params.location);
  const catalogBrandIds = new Set(params.catalog.getBrandIds());
  const blendSite = fixtureId
    ? DEMO_LOGISTIC_SITE_CONTEXT[fixtureId]
    : defaultLogisticSiteContext(siteDensity, params.radiusKm);
  const blended = params.tasteUnavailable
    ? chainRankedInsights(params.insights)
    : orderInsightsByLogisticBlend(params.insights, blendSite);
  const affinities = params.insights.map((i) => i.query?.affinity ?? 0).filter((a) => a > 0);
  const affinityThreshold = affinityThresholdAtPercentile(affinities, 0.75);

  const candidates = blended.filter((candidate) => {
    if (!catalogBrandIds.has(candidate.entity_id)) return false;
    const tier = chainSizeTierFromStoreCount(getNationalStoreCount(candidate.entity_id));
    if (!isProspectChainTier(tier)) return false;
    return isProspectCandidate(candidate, params.insights.length, affinityThreshold);
  });

  type Eligible = { entityId: string; blendedRank: number };
  const eligible: Eligible[] = [];

  for (const candidate of candidates) {
    if (params.agentDagHooks?.excludeProspectEntityIds?.has(candidate.entity_id)) {
      continue;
    }
    const nearbyStores = await presence.storesNearby(candidate.entity_id, absenceRadiusKm);
    if (nearbyStores.length > 0) continue;
    const nationalCount = await params.catalog.getNationalStoreCount(candidate.entity_id);
    if (nationalCount < 5) continue;
    if (!formatFitsStorefront(candidate.entity_id, sqFt)) continue;
    eligible.push({ entityId: candidate.entity_id, blendedRank: candidate.blendedRank });
    if (eligible.length >= params.limit) break;
  }

  const boostIds = params.agentDagHooks?.stratumBoostEntityIds;
  if (boostIds?.size) {
    eligible.sort((a, b) => {
      const aBoost = boostIds.has(a.entityId) ? 0 : 1;
      const bBoost = boostIds.has(b.entityId) ? 0 : 1;
      if (aBoost !== bBoost) return aBoost - bBoost;
      return a.blendedRank - b.blendedRank;
    });
  }

  return eligible.map((e) => e.entityId);
}
