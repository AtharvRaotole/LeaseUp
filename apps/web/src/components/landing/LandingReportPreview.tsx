import { useMemo, useState } from 'react';
import type { AnalysisRequest, ProspectPack } from '@leaseup/contracts';
import { HeadlineCard } from '../report/HeadlineCard';
import { BrandsToPitch } from '../report/BrandsToPitch';
import { QlooProofBanner } from '../report/QlooProofBanner';
import { QlooRankingToggle, type QlooRankingMode } from '../report/QlooRankingToggle';
import { WhyThisBrandCard } from '../report/WhyThisBrandCard';
import {
  LANDING_WICKER_PREVIEW,
  LANDING_WICKER_RADIUS_KM,
  LANDING_WICKER_SLUG,
} from '../../data/landing-wicker-preview';
import { buildReportPath } from '../../lib/report-params';
import { activeBacktestForRankingMode } from '../../lib/ranking-production';

const previewRequest: AnalysisRequest = {
  address: LANDING_WICKER_PREVIEW.location.address,
  radius: LANDING_WICKER_RADIUS_KM,
  storefrontSqFt: 2500,
};

/**
 * Static Wicker report preview from recorded fixtures. No API calls.
 */
export function LandingReportPreview() {
  const results = LANDING_WICKER_PREVIEW;
  const [rankingMode, setRankingMode] = useState<QlooRankingMode>('qloo');
  const [selected, setSelected] = useState<ProspectPack | null>(() => results.prospects[0] ?? null);

  const activeBacktest = useMemo(
    () => activeBacktestForRankingMode(results, rankingMode),
    [rankingMode, results]
  );

  const mapPoster = '/demo/map-poster.jpg';

  return (
    <div
      data-testid="landing-report-preview"
      className="pointer-events-none select-none bg-bg text-left"
      aria-hidden
    >
      <div className="grid grid-cols-12 gap-3 p-3 md:gap-4 md:p-4">
        <div className="col-span-12 space-y-3 xl:col-span-7">
          <div className="flex flex-col gap-2 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
            <QlooRankingToggle mode={rankingMode} onChange={setRankingMode} compact className="shrink-0" />
            {results.backtestBaseline && (
              <div className="min-w-0 flex-1">
                <QlooProofBanner results={results} compact />
              </div>
            )}
          </div>
          <HeadlineCard
            results={results}
            radiusKm={LANDING_WICKER_RADIUS_KM}
            chipSlug={LANDING_WICKER_SLUG}
            backtestOverride={activeBacktest}
          />
          <BrandsToPitch
            results={results}
            request={previewRequest}
            slug={LANDING_WICKER_SLUG}
            selectedId={selected?.brand.entityId ?? null}
            onSelect={setSelected}
            onDraft={() => undefined}
            radiusKm={LANDING_WICKER_RADIUS_KM}
          />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <div
            className="relative min-h-[220px] overflow-hidden rounded-card border border-border bg-surface-2 md:min-h-[280px]"
            role="img"
            aria-label="Map preview from product demo"
          >
            <img
              src={mapPoster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              width={720}
              height={480}
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/30 to-transparent" />
          </div>
          <WhyThisBrandCard
            className="mt-3 hidden md:block"
            prospect={selected}
            results={results}
            radiusKm={LANDING_WICKER_RADIUS_KM}
          />
        </div>
      </div>
    </div>
  );
}

export const landingWickerReportPath = buildReportPath(previewRequest, LANDING_WICKER_SLUG);
