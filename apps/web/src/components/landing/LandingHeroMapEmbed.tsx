import { lazy, Suspense } from 'react';
import {
  LANDING_WICKER_PREVIEW,
  LANDING_WICKER_RADIUS_KM,
} from '../../data/landing-wicker-preview';

const ReportMap = lazy(() =>
  import('../report/ReportMap').then((m) => ({ default: m.ReportMap }))
);

/** Live dark report map slice for the landing hero (fixture data, chromeless). */
export function LandingHeroMapEmbed({ className }: { className?: string }) {
  const results = LANDING_WICKER_PREVIEW;
  const topPitch = results.prospects[0];
  const pitchBrandIds = topPitch ? [topPitch.brand.entityId] : [];

  return (
    <Suspense
      fallback={
        <img
          src="/demo/landing-hero-map-dark.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
        />
      }
    >
      <ReportMap
        results={results}
        selectedBrand={null}
        pitchBrandIds={pitchBrandIds}
        radiusKm={LANDING_WICKER_RADIUS_KM}
        embed
        className={className ?? 'h-full min-h-[140px] w-full'}
      />
    </Suspense>
  );
}
