import { lazy, Suspense } from 'react';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Skeleton } from '../ui/Skeleton';

export type MapBrandSelection = { entityId: string; name: string };

const MapInner = lazy(() => import('./ReportMapInner'));

export function ReportMap({
  results,
  selectedBrand,
  radiusKm,
  className,
}: {
  results: AnalysisResponse;
  selectedBrand: MapBrandSelection | null;
  radiusKm: number;
  className?: string;
}) {
  return (
    <div className={className ?? 'h-full min-h-[520px] w-full'}>
      <Suspense fallback={<Skeleton className="h-full min-h-[520px] w-full rounded-card" />}>
        <MapInner results={results} selectedBrand={selectedBrand} radiusKm={radiusKm} />
      </Suspense>
    </div>
  );
}
