import type { AnalysisRequest, AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { sha256Short } from './cache-key';
import { SITE_PUBLIC_ORIGIN, WORKER_PUBLIC_ORIGIN } from './public-urls';

export type SharePreviewMeta = {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
};

const OG_VERSION = 'v1';

function areaLabel(results: AnalysisResponse): string {
  return (
    results.location.neighborhood?.trim() ||
    results.location.city?.trim() ||
    results.location.address
  );
}

function topBrandSummary(results: AnalysisResponse, max = 3): string {
  const names = results.prospects.slice(0, max).map((p, i) => {
    const name = displayBrandName(p.brand.entityId, p.brand.name);
    const rank = p.brand.affinityRank ?? i + 1;
    return `#${rank} ${name}`;
  });
  return names.join(' · ');
}

export function reportShareMeta(
  results: AnalysisResponse,
  radiusKm: number,
  canonicalPath: string
): SharePreviewMeta {
  const area = areaLabel(results);
  const count = results.prospects.length;
  const title =
    count > 0
      ? `${count} brands to pitch near ${area} · LeaseUp`
      : `Tenant shortlist for ${area} · LeaseUp`;
  const picks = topBrandSummary(results);
  const description =
    count > 0
      ? `${radiusKm} km radius. Top picks: ${picks}. Qloo taste + verified store absence.`
      : `Every tracked brand already has a store within ${radiusKm} km of ${area}.`;
  const canonicalUrl = `${SITE_PUBLIC_ORIGIN}${canonicalPath}`;
  const imageUrl = `${WORKER_PUBLIC_ORIGIN}/api/og/report.png?${reportOgQueryFromResults(
    results,
    radiusKm
  )}`;

  return { title, description, imageUrl, canonicalUrl };
}

export function pitchShareMeta(snapshot: PitchPackSnapshot, canonicalPath: string): SharePreviewMeta {
  const area =
    snapshot.neighborhood?.trim() ||
    snapshot.location.neighborhood?.trim() ||
    snapshot.location.city?.trim() ||
    snapshot.address;
  const title = `Pitch pack · ${area} · LeaseUp`;
  const picks = snapshot.prospects
    .slice(0, 3)
    .map((row, i) => {
      const name = displayBrandName(row.prospect.brand.entityId, row.prospect.brand.name);
      const rank = row.prospect.brand.affinityRank ?? i + 1;
      return `#${rank} ${name}`;
    })
    .join(' · ');
  const description = `${snapshot.radiusKm} km trade area · ${snapshot.prospects.length} prospects. ${picks}`;
  const canonicalUrl = `${SITE_PUBLIC_ORIGIN}${canonicalPath}`;
  const imageUrl = `${WORKER_PUBLIC_ORIGIN}/api/og/pitch/${snapshot.id}.png`;

  return { title, description, imageUrl, canonicalUrl };
}

/** Stable query string for OG image cache keys (report). */
export function reportOgQueryFromRequest(request: AnalysisRequest): string {
  const params = new URLSearchParams();
  params.set('address', request.address);
  params.set('radius', String(request.radius));
  if (request.categoryTags?.length) params.set('category', request.categoryTags.join(','));
  if (request.storefrontSqFt !== undefined) params.set('sqft', String(request.storefrontSqFt));
  const loc = request.confirmedLocation;
  if (loc) {
    params.set('lat', String(loc.latitude));
    params.set('lng', String(loc.longitude));
    params.set('pinConfirmed', '1');
    if (loc.resolvedAddress) params.set('resolved', loc.resolvedAddress);
    if (loc.neighborhood) params.set('neighborhood', loc.neighborhood);
    if (loc.city) params.set('city', loc.city);
  }
  return params.toString();
}

function reportOgQueryFromResults(results: AnalysisResponse, radiusKm: number): string {
  const params = new URLSearchParams();
  params.set('address', results.location.address);
  params.set('radius', String(radiusKm));
  if (results.location.latitude) params.set('lat', String(results.location.latitude));
  if (results.location.longitude) params.set('lng', String(results.location.longitude));
  params.set('pinConfirmed', '1');
  if (results.location.neighborhood) params.set('neighborhood', results.location.neighborhood);
  if (results.location.city) params.set('city', results.location.city);
  return params.toString();
}

export async function reportOgCacheKey(request: AnalysisRequest): Promise<string> {
  return sha256Short(`${OG_VERSION}:report:${reportOgQueryFromRequest(request)}`);
}

export function pitchOgCacheKey(pitchId: string): string {
  return `${OG_VERSION}:pitch:${pitchId}`;
}

export function analysisRequestFromSearchParams(params: URLSearchParams): AnalysisRequest {
  const address = params.get('address');
  if (!address) throw new Error('address required');
  const radius = Number(params.get('radius') || '10');
  const category = params.get('category');
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const pinConfirmed = params.get('pinConfirmed') === '1';
  const sqft = Number(params.get('sqft') || '2500');
  const confirmedLocation =
    pinConfirmed && Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          address,
          latitude: lat,
          longitude: lng,
          resolvedAddress: params.get('resolved') ?? undefined,
          neighborhood: params.get('neighborhood') ?? undefined,
          city: params.get('city') ?? undefined,
        }
      : undefined;
  return {
    address,
    radius: Number.isFinite(radius) ? radius : 10,
    categoryTags: category ? category.split(',').filter(Boolean) : undefined,
    storefrontSqFt: Number.isFinite(sqft) ? sqft : 2500,
    confirmedLocation,
  };
}
