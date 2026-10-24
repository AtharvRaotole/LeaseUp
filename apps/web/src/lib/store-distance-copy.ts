import type { AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';
import { formatUserFacingDate, isSameUserFacingCalendarDay } from './format-date';

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

/** Honest saved-pitch label for reconcile-on-read (#144). */
export function pitchFreshnessHonestyLine(
  snapshot: PitchPackSnapshot,
  now: Date = new Date()
): string {
  const savedIso = snapshot.createdAt ?? snapshot.analysisTimestamp;
  const saved = formatUserFacingDate(savedIso);

  if (storeDistancesSnapshotOnly(snapshot)) {
    const asOf = storeDistanceDataAsOf(snapshot);
    if (asOf) {
      return `Saved ${saved}. Store distances from snapshot ${formatUserFacingDate(asOf)}.`;
    }
    return `Saved ${saved}. Store distances from saved snapshot.`;
  }

  const refreshedIso = storeDistanceDataAsOf(snapshot);
  if (refreshedIso && isSameUserFacingCalendarDay(refreshedIso, now)) {
    return `Saved ${saved}. Store distances refreshed today.`;
  }
  if (refreshedIso) {
    return `Saved ${saved}. Store distances refreshed ${formatUserFacingDate(refreshedIso)}.`;
  }
  return `Saved ${saved}. Store distances refreshed on open.`;
}
