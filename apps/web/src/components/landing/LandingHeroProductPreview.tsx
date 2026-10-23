import { useState } from 'react';
import { Link } from 'react-router-dom';
import { landingWickerReportPath } from './LandingReportPreview';
import { LandingHeroFixtureFrame } from './LandingHeroFixtureFrame';
import heroLightAvif from '../../assets/landing-hero/hero-wicker-light.avif';
import heroLightWebp from '../../assets/landing-hero/hero-wicker-light.webp';
import heroDarkAvif from '../../assets/landing-hero/hero-wicker-dark.avif';
import heroDarkWebp from '../../assets/landing-hero/hero-wicker-dark.webp';

const HERO_WIDTH = 720;
const HERO_HEIGHT = 400;

export function LandingHeroProductPreview() {
  const [useFixtureFallback, setUseFixtureFallback] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[720px] lg:mx-0" data-testid="landing-hero-product-preview">
      <Link
        to={landingWickerReportPath}
        className="group relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label="Open the Wicker Park demo report"
      >
        <div
          className="pointer-events-none absolute -inset-1 rounded-[14px] bg-accent/10 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div
          className="relative overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_20px_50px_-16px_rgba(0,0,0,0.2)] transition-transform duration-200 group-hover:-translate-y-0.5 dark:shadow-[0_24px_56px_-18px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57] sm:h-2.5 sm:w-2.5" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-[#febc2e] sm:h-2.5 sm:w-2.5" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-[#28c840] sm:h-2.5 sm:w-2.5" aria-hidden />
            <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] text-ink-3 sm:ml-3 sm:px-3 sm:py-1 sm:text-[11px]">
              leaseup.app{landingWickerReportPath}
            </div>
          </div>
          {useFixtureFallback ? (
            <LandingHeroFixtureFrame />
          ) : (
            <picture className="block">
              <source
                type="image/avif"
                media="(prefers-color-scheme: dark)"
                srcSet={heroDarkAvif}
              />
              <source type="image/webp" media="(prefers-color-scheme: dark)" srcSet={heroDarkWebp} />
              <source type="image/avif" srcSet={heroLightAvif} />
              <source type="image/webp" srcSet={heroLightWebp} />
              <img
                data-testid="landing-hero-preview-img"
                src={heroLightWebp}
                alt=""
                width={HERO_WIDTH}
                height={HERO_HEIGHT}
                loading="eager"
                decoding="async"
                fetchPriority="low"
                className="block h-auto w-full bg-bg"
                onError={() => setUseFixtureFallback(true)}
              />
            </picture>
          )}
        </div>
        <p className="mt-3 text-center text-meta text-ink-2 lg:text-left">
          <span className="text-ink-3">Recorded demo</span>
          <span className="mx-1.5 text-ink-3" aria-hidden>·</span>
          <span className="font-medium text-accent group-hover:underline">Open Wicker Park report</span>
        </p>
      </Link>
    </div>
  );
}
