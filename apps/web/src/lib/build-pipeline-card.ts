import type { AnalysisResponse, PitchPackSnapshot, PipelineAddCard, ProspectPack } from '@leaseup/contracts';
import { verificationShortLabel } from './copy';
import { displayBrandName } from './brand-display';

export function pipelineCardFromProspect(
  prospect: ProspectPack,
  results: AnalysisResponse,
  options?: { pitchId?: string; pitchLink?: string; reportPath?: string }
): PipelineAddCard {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  return {
    brandEntityId: prospect.brand.entityId,
    brandName: name,
    propertyAddress: results.location.address,
    propertyNeighborhood:
      results.location.neighborhood ?? results.location.city ?? undefined,
    affinityRank: prospect.brand.affinityRank,
    verification: verificationShortLabel(prospect.brand.verified),
    pitchId: options?.pitchId,
    pitchLink: options?.pitchLink,
    reportPath: options?.reportPath,
    outreachContext: {
      reasons: prospect.reasons,
      neighborhood: results.location.neighborhood ?? results.location.city,
      nearestStoreKm: prospect.nearestExistingStoreKm,
      runId: results.runId,
    },
  };
}

export function pipelineCardFromPitchProspect(
  snapshot: PitchPackSnapshot,
  prospect: ProspectPack,
  pitchLink: string
): PipelineAddCard {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  return {
    brandEntityId: prospect.brand.entityId,
    brandName: name,
    propertyAddress: snapshot.address,
    propertyNeighborhood:
      snapshot.neighborhood ?? snapshot.location.neighborhood ?? snapshot.location.city,
    affinityRank: prospect.brand.affinityRank,
    verification: verificationShortLabel(prospect.brand.verified),
    pitchId: snapshot.id,
    pitchLink,
    outreachContext: {
      reasons: prospect.reasons,
      neighborhood: snapshot.neighborhood ?? snapshot.location.neighborhood,
      nearestStoreKm: prospect.nearestExistingStoreKm,
      runId: snapshot.runId,
    },
  };
}
