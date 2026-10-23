import { lazy, Suspense } from 'react';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Skeleton } from '../ui/Skeleton';

const MapInner = lazy(() => import('./ReportMapInner'));

export function ReportMap(props: {
  results: AnalysisResponse;
  selectedProspect: ProspectPack | null;
  radiusKm: number;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-full min-h-[360px] w-full rounded-card" />}>
      <MapInner {...props} />
    </Suspense>
  );
}
