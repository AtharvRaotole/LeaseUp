import type {
  AnalysisResponse,
  PitchPackSnapshot,
  PipelineAddCard,
  PipelineEvidenceSnapshot,
  ProspectPack,
} from '@leaseup/contracts';
import { prospectOneLineReason } from './prospect-one-line';
import { verificationShortLabel } from './copy';
import { coTenantBrandNames } from './co-tenancy-mix';
import { displayBrandName } from './brand-display';

export function pipelineEvidenceFromProspect(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): PipelineEvidenceSnapshot {
  return {
    savedAt: new Date().toISOString(),
    oneLineReason: prospectOneLineReason(prospect, results, radiusKm),
    reasons: prospect.reasons,
    affinityRank: prospect.brand.affinityRank,
    nearestStoreKm: prospect.nearestExistingStoreKm,
    verification: verificationShortLabel(prospect.brand.verified),
    runId: results.runId,
    radiusKm,
  };
}

export function pipelineCardFromProspect(
  prospect: ProspectPack,
  results: AnalysisResponse,
  options?: { pitchId?: string; pitchLink?: string; reportPath?: string; radiusKm?: number }
): PipelineAddCard {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const radiusKm = options?.radiusKm ?? 10;
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
      coTenantBrands: coTenantBrandNames(results),
      verificationLabel: verificationShortLabel(prospect.brand.verified),
    },
    evidenceSnapshot: pipelineEvidenceFromProspect(prospect, results, radiusKm),
    radiusKm,
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
