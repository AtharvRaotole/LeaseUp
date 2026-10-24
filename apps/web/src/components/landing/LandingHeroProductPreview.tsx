import { useState } from 'react';
import { Link } from 'react-router-dom';
import { landingWickerReportPath } from './LandingReportPreview';
import { LandingHeroFixtureFrame } from './LandingHeroFixtureFrame';
import { LANDING_PUBLIC_HOST } from '../../lib/landing-public-host';
import heroLightWebp from '../../assets/landing-hero/hero-wicker-light.webp';
import heroDarkWebp from '../../assets/landing-hero/hero-wicker-dark.webp';

/** CSS display width on desktop; raster assets are 2× for crisp type. */
const HERO_DISPLAY_WIDTH = 600;
const HERO_DISPLAY_HEIGHT = 299;
const HERO_ASPECT = `${HERO_DISPLAY_WIDTH} / ${HERO_DISPLAY_HEIGHT}`;

export function LandingHeroProductPreview() {
  const [useFixtureFallback, setUseFixtureFallback] = useState(false);

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-[600px] overflow-hidden lg:mx-0 xl:max-w-[640px]"
      data-testid="landing-hero-product-preview"
    >
      <Link
        to={landingWickerReportPath}
        className="group relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <div
          className="relative overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_20px_50px_-16px_rgba(0,0,0,0.2)] ring-0 ring-accent/0 transition-[transform,box-shadow,ring-color] duration-200 group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-accent/15 dark:shadow-[0_24px_56px_-18px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57] sm:h-2.5 sm:w-2.5" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-[#febc2e] sm:h-2.5 sm:w-2.5" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-[#28c840] sm:h-2.5 sm:w-2.5" aria-hidden />
            <div
              className="ml-2 min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] text-ink-3 sm:ml-3 sm:px-3 sm:py-1 sm:text-[11px]"
              title={`${LANDING_PUBLIC_HOST}${landingWickerReportPath}`}
            >
              {LANDING_PUBLIC_HOST}
              {landingWickerReportPath}
            </div>
          </div>
          {useFixtureFallback ? (
            <LandingHeroFixtureFrame />
          ) : (
            <div className="relative w-full bg-bg" style={{ aspectRatio: HERO_ASPECT }}>
              <img
                data-testid="landing-hero-preview-img-light"
                src={heroLightWebp}
                alt=""
                width={HERO_DISPLAY_WIDTH}
                height={HERO_DISPLAY_HEIGHT}
                loading="eager"
                decoding="async"
                className="absolute inset-0 block h-full w-full object-cover object-top dark:hidden"
                onError={() => setUseFixtureFallback(true)}
              />
              <img
                data-testid="landing-hero-preview-img-dark"
                src={heroDarkWebp}
                alt=""
                width={HERO_DISPLAY_WIDTH}
                height={HERO_DISPLAY_HEIGHT}
                loading="eager"
                decoding="async"
                className="absolute inset-0 hidden h-full w-full object-cover object-top dark:block"
                onError={() => setUseFixtureFallback(true)}
              />
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-meta text-ink-2 lg:text-left">
          <span className="text-ink-3">Sample report: Wicker Park, Chicago</span>
          <span className="mx-1.5 text-ink-3" aria-hidden>·</span>
          <span className="font-medium text-accent group-hover:underline">Open Wicker Park report</span>
        </p>
      </Link>
    </div>
  );
}
