import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import {
  LANDING_WICKER_PREVIEW,
  LANDING_WICKER_RADIUS_KM,
} from '../data/landing-wicker-preview';

/** Static route for store-absence copy screenshots (fixture-backed, no API). */
export function WickerWhyCardCapturePage() {
  const prospect = LANDING_WICKER_PREVIEW.prospects[0] ?? null;
  return (
    <div className="inline-block bg-bg p-4">
      <WhyThisBrandCard
        prospect={prospect}
        results={LANDING_WICKER_PREVIEW}
        radiusKm={LANDING_WICKER_RADIUS_KM}
      />
    </div>
  );
}
