import type { PitchPackSnapshot } from '@leaseup/contracts';
import { displayBrandName } from '../../lib/brand-display';
import { pitchCheckedSourcesLabel } from '../../lib/copy';
import {
  pitchBrandFitLines,
  pitchNextStepLine,
  pitchBriefKindLabel,
  pitchDateMetaLine,
  pitchPropertyHeadline,
  pitchTradeAreaFacts,
} from '../../lib/pitch-pack-copy';
import { fitPercentileLabel } from '../../lib/fit-display';
import { BrandReachLine } from '../report/BrandReachLine';

export function PitchPackBrief({ snapshot }: { snapshot: PitchPackSnapshot }) {
  const propertyTitle = pitchPropertyHeadline(snapshot);
  const totalScored = snapshot.rankingsTotal ?? snapshot.prospects[0]?.prospect.brand.affinityRank ?? 1;

  return (
    <div className="pitch-pack-brief space-y-8 print:space-y-5" data-testid="pitch-pack-brief">
      <header className="pitch-pack-hero border-b border-border pb-6 print:pb-4">
        <p className="text-label uppercase tracking-wide text-ink-3">{pitchBriefKindLabel(snapshot)}</p>
        <h1 className="mt-2 break-words font-display font-semibold text-display text-ink">{propertyTitle}</h1>
        <p className="mt-2 break-words text-lg text-ink-2">{snapshot.address}</p>
        <p className="mt-1 text-sm text-ink-3" data-testid="pitch-date-meta">
          {pitchDateMetaLine(snapshot)}
        </p>
        {(snapshot.landlord?.name || snapshot.landlord?.contact) && (
          <p className="mt-3 text-sm text-ink-2">
            {snapshot.landlord?.name && <span className="font-medium text-ink">{snapshot.landlord.name}</span>}
            {snapshot.landlord?.name && snapshot.landlord?.contact && ' · '}
            {snapshot.landlord?.contact}
          </p>
        )}
      </header>

      <div className="space-y-10 print:space-y-6">
        {snapshot.prospects.map(({ prospect }, index) => {
          const brandName = displayBrandName(prospect.brand.entityId, prospect.brand.name);
          const fitLines = pitchBrandFitLines(prospect, snapshot);
          const rankLabel = fitPercentileLabel(prospect.brand.affinityRank, totalScored);
          return (
            <article
              key={prospect.brand.entityId}
              className="pitch-brand-brief rounded-card border border-border bg-surface px-5 py-6 print:rounded-none print:border-ink/20 print:px-0 print:py-3 print:shadow-none"
              data-testid="pitch-brand-brief"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4 print:pb-2">
                <div>
                  <p className="text-label uppercase text-ink-3">For {brandName}</p>
                  <h2 className="mt-1 font-display font-semibold text-2xl text-ink print:text-xl">
                    {propertyTitle} × {brandName}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-ink-2">Pitch priority #{index + 1}</p>
                  {prospect.brand.affinityRank > 0 && totalScored > 0 && (
                    <p className="mt-0.5 text-xs text-ink-3">
                      Taste rank #{prospect.brand.affinityRank} of {totalScored}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-ink-2">{rankLabel}</p>
              <p className="mt-1 text-sm text-ink-3" data-testid="pitch-brand-verification">
                {pitchCheckedSourcesLabel(prospect)}
              </p>

              <div className="mt-4 space-y-2" data-testid="pitch-brand-why">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-3">Why this brand fits here</h3>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink print:text-xs">
                  {fitLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              {index === 0 && snapshot.mapImage && (
                <figure
                  className="pitch-map-frame mt-5 overflow-hidden rounded-card border border-border bg-surface-2 print:mt-3 print:rounded-sm"
                >
                  <img
                    src={snapshot.mapImage}
                    alt="Map of the storefront pin, shopper demand heat, and nearby stores"
                    className="pitch-map-image w-full object-cover"
                  />
                  <figcaption className="border-t border-border px-4 py-2 text-meta text-ink-3 print:py-1">
                    Site pin with shopper demand (orange) and nearby stores in the trade area
                  </figcaption>
                </figure>
              )}

              {index === 0 && (
                <section className="pitch-trade-area-facts mt-5 print:mt-3" aria-labelledby="pitch-trade-area-heading">
                  <h3 id="pitch-trade-area-heading" className="font-display font-semibold text-lg text-ink print:text-base">
                    Trade area
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2 print:text-xs">
                    {pitchTradeAreaFacts(snapshot).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              <div
                className="pitch-brand-contact-slot mt-5 min-h-[2.75rem] rounded-control border border-dashed border-border bg-surface-2/60 px-3 py-2.5 text-sm print:mt-3 print:min-h-0 print:border-ink/25 print:bg-transparent"
                data-testid="pitch-brand-contact-slot"
              >
                {prospect.brandReach ? (
                  <BrandReachLine reach={prospect.brandReach} />
                ) : (
                  <span className="text-ink-3">
                    How to reach them: brand real-estate contact will appear here when your team adds it.
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm font-medium text-ink print:mt-2">{pitchNextStepLine(brandName)}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
