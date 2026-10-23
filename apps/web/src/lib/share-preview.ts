import type { AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { SITE_PUBLIC_ORIGIN, WORKER_PUBLIC_ORIGIN } from './public-origins';
import type { ShareHeadProps } from '../components/seo/ShareHead';

function areaLabel(results: AnalysisResponse): string {
  return (
    results.location.neighborhood?.trim() ||
    results.location.city?.trim() ||
    results.location.address
  );
}

function topBrandSummary(results: AnalysisResponse, max = 3): string {
  return results.prospects
    .slice(0, max)
    .map((p, i) => {
      const name = displayBrandName(p.brand.entityId, p.brand.name);
      const rank = p.brand.affinityRank ?? i + 1;
      return `#${rank} ${name}`;
    })
    .join(' · ');
}

export function reportShareHead(
  results: AnalysisResponse,
  radiusKm: number,
  canonicalPath: string,
  ogQuery: string
): ShareHeadProps {
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
  return {
    title,
    description,
    canonicalUrl: `${SITE_PUBLIC_ORIGIN}${canonicalPath}`,
    imageUrl: `${WORKER_PUBLIC_ORIGIN}/api/og/report.png?${ogQuery}`,
  };
}

export function pitchShareHead(snapshot: PitchPackSnapshot, canonicalPath: string): ShareHeadProps {
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
  return {
    title,
    description,
    canonicalUrl: `${SITE_PUBLIC_ORIGIN}${canonicalPath}`,
    imageUrl: `${WORKER_PUBLIC_ORIGIN}/api/og/pitch/${snapshot.id}.png`,
  };
}
