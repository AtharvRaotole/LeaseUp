import type { AnalysisResponse } from '@leaseup/contracts';

/** Single instant for ATP + OSM snapshot freshness shown on the report. */
export function analysisStoreDataAsOfIso(results: AnalysisResponse): string {
  return results.osmSnapshotRecordedAt ?? results.timestamp;
}

/** Calendar date in UTC so OSM and ATP lines never disagree by time zone. */
export function formatStoreDataDateUtc(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function analysisStoreDataDateLabel(results: AnalysisResponse): string {
  return formatStoreDataDateUtc(analysisStoreDataAsOfIso(results));
}
