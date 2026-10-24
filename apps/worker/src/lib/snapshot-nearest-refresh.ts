import type { AnalysisResponse, Location, PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import type { Env } from '../index';
import { enrichProspectsWithNearest } from './analysis-enrichment';
import { stripFalseAbsenceReasons } from './nearest-store-reconcile';
import { getResponseCache } from './worker-cache';
import { createStoreCatalog } from '../services/store-catalog';
import {
  OsmSnapshotCatalog,
  osmSnapshotRecordedAt,
} from '../services/osm-snapshot-catalog';

export type StoreDistanceServeMeta = {
  storeDistanceDataAsOf: string;
  storeDistancesSnapshotOnly: boolean;
};

/** Same cap as analyze pitch generation; bounds reconcile-on-read CPU on stored payloads. */
export const RECONCILE_ON_READ_MAX_PROSPECTS = 10;

/** Prefer reconciled km when present; never invent a distance. */
export function mergeReconciledNearestProspect(
  stored: ProspectPack,
  reconciled: ProspectPack,
  absenceRadiusKm: number
): { pack: ProspectPack; snapshotOnly: boolean } {
  if (
    reconciled.nearestExistingStoreKm === undefined &&
    stored.nearestExistingStoreKm !== undefined
  ) {
    return {
      pack: stripFalseAbsenceReasons(stored, absenceRadiusKm),
      snapshotOnly: true,
    };
  }
  return { pack: reconciled, snapshotOnly: false };
}

function resolveStoreDistanceDataAsOf(
  existing?: string,
  fallbackTimestamp?: string
): string {
  return existing ?? osmSnapshotRecordedAt() ?? fallbackTimestamp ?? new Date().toISOString();
}

/**
 * Reconcile nearest-store km from All The Places + OSM on read. Does not persist or call Qloo.
 */
export async function refreshProspectPacksNearest(
  env: Env,
  location: Location,
  prospects: ProspectPack[],
  absenceRadiusKm: number,
  dataAsOfHint?: string
): Promise<{ prospects: ProspectPack[] } & StoreDistanceServeMeta> {
  const mode = env.APP_MODE === 'live' ? 'live' : 'demo';
  const catalog = createStoreCatalog(env, mode);
  const osmSnapshot = env.ASSETS
    ? new OsmSnapshotCatalog(env.ASSETS, getResponseCache())
    : null;

  const storeDistanceDataAsOf = resolveStoreDistanceDataAsOf(dataAsOfHint);
  let storeDistancesSnapshotOnly = prospects.length > RECONCILE_ON_READ_MAX_PROSPECTS;

  const head = prospects.slice(0, RECONCILE_ON_READ_MAX_PROSPECTS);
  const tail = prospects.slice(RECONCILE_ON_READ_MAX_PROSPECTS);

  const enriched = await enrichProspectsWithNearest(
    head,
    location,
    catalog,
    undefined,
    osmSnapshot
  );

  const refreshedHead = enriched.map((pack, index) => {
    const stored = head[index]!;
    const reconciled = stripFalseAbsenceReasons(pack, absenceRadiusKm);
    const merged = mergeReconciledNearestProspect(stored, reconciled, absenceRadiusKm);
    if (merged.snapshotOnly) storeDistancesSnapshotOnly = true;
    return merged.pack;
  });

  const refreshedTail = tail.map((stored) => stripFalseAbsenceReasons(stored, absenceRadiusKm));
  const refreshed = [...refreshedHead, ...refreshedTail];

  return {
    prospects: refreshed,
    storeDistanceDataAsOf,
    storeDistancesSnapshotOnly,
  };
}

export async function refreshPitchPackNearestStores(
  env: Env,
  snapshot: PitchPackSnapshot
): Promise<PitchPackSnapshot> {
  const absenceKm = snapshot.absenceRadiusKm ?? snapshot.radiusKm;
  const packs = snapshot.prospects.map((row) => row.prospect);
  const { prospects, storeDistanceDataAsOf, storeDistancesSnapshotOnly } =
    await refreshProspectPacksNearest(
      env,
      snapshot.location,
      packs,
      absenceKm,
      snapshot.osmSnapshotRecordedAt ?? snapshot.analysisTimestamp
    );

  return {
    ...snapshot,
    prospects: snapshot.prospects.map((row, index) => ({
      ...row,
      prospect: prospects[index]!,
    })),
    storeDistanceDataAsOf,
    storeDistancesSnapshotOnly,
  };
}

export async function refreshAnalysisNearestStores(
  env: Env,
  analysis: AnalysisResponse
): Promise<AnalysisResponse> {
  const absenceKm = analysis.prospectFunnel?.absenceRadiusKm ?? 10;
  const { prospects, storeDistanceDataAsOf, storeDistancesSnapshotOnly } =
    await refreshProspectPacksNearest(
      env,
      analysis.location,
      analysis.prospects,
      absenceKm,
      analysis.osmSnapshotRecordedAt ?? analysis.timestamp
    );

  return {
    ...analysis,
    prospects,
    storeDistanceDataAsOf,
    storeDistancesSnapshotOnly,
  };
}
