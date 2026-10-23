import type { QlooLocation } from './qloo';

/** Qloo /v2/insights accepts at most ~45 filter.results.entities per request. */
export const QLOO_MAX_BRANDS_PER_REQUEST = 45;

export function formatWktPoint(longitude: number, latitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}

export function applyQlooInsightsLocationParams(url: URL, location: QlooLocation): void {
  if (location.kind === 'point') {
    url.searchParams.set(
      'signal.location',
      formatWktPoint(location.longitude, location.latitude)
    );
    url.searchParams.set('signal.location.radius', String(Math.round(location.radiusKm * 1000)));
    return;
  }
  url.searchParams.set('signal.location.query', location.query);
}

/** Heatmaps require filter.location WKT (not signal.location). */
export function applyQlooHeatmapLocationParams(url: URL, location: QlooLocation): void {
  if (location.kind === 'point') {
    url.searchParams.set(
      'filter.location',
      formatWktPoint(location.longitude, location.latitude)
    );
    url.searchParams.set('filter.location.radius', String(Math.round(location.radiusKm * 1000)));
    return;
  }
  url.searchParams.set('filter.location.query', location.query);
}

/** @deprecated use applyQlooInsightsLocationParams */
export const applyQlooLocationParams = applyQlooInsightsLocationParams;

export function chunkBrandIds(brandIds: string[], size = QLOO_MAX_BRANDS_PER_REQUEST): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < brandIds.length; i += size) {
    chunks.push(brandIds.slice(i, i + size));
  }
  return chunks;
}
