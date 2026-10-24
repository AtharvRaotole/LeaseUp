import { lazy, Suspense, type RefObject } from 'react';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Skeleton } from '../ui/Skeleton';

export type MapBrandSelection = { entityId: string; name: string };

export type ReportMapCaptureRef = {
  captureSnapshot: () => string | null;
  /** Waits for shopper-demand heatmap (top pitch brand) before capture. */
  capturePitchSnapshot: () => Promise<string | null>;
};

const MapInner = lazy(() => import('./ReportMapInner'));

export function ReportMap({
  results,
  selectedBrand,
  pitchBrandIds,
  radiusKm,
  className,
  captureRef,
  embed = false,
}: {
  results: AnalysisResponse;
  selectedBrand: MapBrandSelection | null;
  pitchBrandIds: string[];
  radiusKm: number;
  className?: string;
  captureRef?: RefObject<ReportMapCaptureRef | null>;
  embed?: boolean;
}) {
  const minH = embed ? 'min-h-[140px]' : 'min-h-[520px]';
  return (
    <div className={className ?? `h-full ${minH} w-full`}>
      <Suspense fallback={<Skeleton className={`h-full ${minH} w-full rounded-card`} />}>
        <MapInner
          results={results}
          selectedBrand={selectedBrand}
          pitchBrandIds={pitchBrandIds}
          radiusKm={radiusKm}
          captureRef={captureRef}
          embed={embed}
        />
      </Suspense>
    </div>
  );
}
