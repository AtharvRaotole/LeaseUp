import {
  LANDING_WICKER_PREVIEW,
  LANDING_WICKER_RADIUS_KM,
} from '../../data/landing-wicker-preview';
import { displayBrandName } from '../../lib/brand-display';
import { prospectOneLineReason } from '../../lib/prospect-one-line';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';

type LandingHeroFixtureFrameProps = {
  /** High-density layout for 2× raster capture (no browser chrome). */
  capture?: boolean;
};

/** Compact Wicker report slice for hero preview (fixture data only). */
export function LandingHeroFixtureFrame({ capture = false }: LandingHeroFixtureFrameProps) {
  const results = LANDING_WICKER_PREVIEW;
  const topThree = results.prospects.slice(0, 3);
  const neighborhood = results.location.neighborhood ?? 'Wicker Park';

  return (
    <div
      data-testid="landing-hero-preview-frame"
      className={
        capture
          ? 'grid w-[640px] max-w-full grid-cols-[minmax(0,1fr)_46%] gap-3 bg-bg p-3'
          : 'grid grid-cols-1 gap-3 bg-bg p-3 sm:grid-cols-[1fr_42%] sm:gap-4 sm:p-4'
      }
    >
      <div className="min-w-0">
        <p
          className={
            capture
              ? 'text-[11px] font-medium uppercase tracking-wide text-ink-3'
              : 'text-meta font-medium uppercase text-ink-3'
          }
        >
          {neighborhood}
        </p>
        <h2
          className={
            capture
              ? 'mt-0.5 font-display text-[1.125rem] font-semibold leading-tight text-ink'
              : 'mt-1 font-display text-body-lg font-semibold text-ink'
          }
        >
          Top brands to pitch
        </h2>
        <ol className={capture ? 'mt-2 space-y-2' : 'mt-3 space-y-2.5'}>
          {topThree.map((prospect, index) => {
            const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
            const reason = prospectOneLineReason(prospect, results, LANDING_WICKER_RADIUS_KM);
            return (
              <li
                key={prospect.brand.entityId}
                className={
                  capture
                    ? 'flex gap-2.5 rounded-control border border-border bg-surface px-2.5 py-2'
                    : 'flex gap-3 rounded-control border border-border bg-surface px-3 py-2.5'
                }
              >
                <span
                  className={
                    capture
                      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-small font-semibold text-ink'
                      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-meta font-semibold text-ink'
                  }
                  style={{ background: brandTint(name) }}
                >
                  {brandMonogram(name)}
                </span>
                <span className="min-w-0">
                  <span
                    className={
                      capture
                        ? 'block text-[15px] font-medium leading-snug text-ink'
                        : 'block text-small font-medium text-ink'
                    }
                  >
                    <span className="text-meta text-ink-3">#{index + 1}</span> {name}
                  </span>
                  <span
                    className={
                      capture
                        ? 'mt-0.5 block text-[13px] leading-snug text-ink-2'
                        : 'mt-0.5 block text-meta leading-snug text-ink-2'
                    }
                  >
                    {reason}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className={
          capture
            ? 'relative min-h-[220px] overflow-hidden rounded-control border border-border bg-surface-2'
            : 'relative min-h-[140px] overflow-hidden rounded-control border border-border bg-surface-2 sm:min-h-0'
        }
        role="img"
        aria-label="Map preview for Wicker Park trade area"
      >
        <img
          src="/demo/map-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          width={320}
          height={240}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/25 to-transparent" aria-hidden />
      </div>
    </div>
  );
}
