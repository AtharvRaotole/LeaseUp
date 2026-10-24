import type { AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';
import { formatUserFacingDate } from './format-date';

export function storeDistanceDataAsOf(
  payload: Pick<
    PitchPackSnapshot,
    'storeDistanceDataAsOf' | 'osmSnapshotRecordedAt' | 'analysisTimestamp'
  >
): string | undefined {
  return payload.storeDistanceDataAsOf ?? payload.osmSnapshotRecordedAt ?? payload.analysisTimestamp;
}

export function storeDistanceDataAsOfFromAnalysis(
  results: Pick<
    AnalysisResponse,
    'storeDistanceDataAsOf' | 'osmSnapshotRecordedAt' | 'timestamp'
  >
): string | undefined {
  return results.storeDistanceDataAsOf ?? results.osmSnapshotRecordedAt ?? results.timestamp;
}

export function storeDistancesSnapshotOnly(
  payload: Pick<PitchPackSnapshot, 'storeDistancesSnapshotOnly'>
): boolean {
  return payload.storeDistancesSnapshotOnly === true;
}

export function storeDistancesSnapshotOnlyFromAnalysis(
  results: Pick<AnalysisResponse, 'storeDistancesSnapshotOnly'>
): boolean {
  return results.storeDistancesSnapshotOnly === true;
}

/** Trailing clause for nearest-store distance lines (no invented km). */
export function nearestStoreDistanceAttribution(
  snapshotOnly: boolean,
  dataAsOf?: string
): string {
  if (snapshotOnly) {
    if (dataAsOf) {
      return `tracked chain store data from snapshot ${formatUserFacingDate(dataAsOf)}`;
    }
    return 'tracked chain store data from saved snapshot';
  }
  if (dataAsOf) {
    return `tracked chain store data, store index as of ${formatUserFacingDate(dataAsOf)}`;
  }
  return 'tracked chain store data';
}
