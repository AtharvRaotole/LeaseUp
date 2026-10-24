import { Link } from 'react-router-dom';
import { landingWickerReportPath } from './LandingReportPreview';
import { LandingHeroFixtureFrame } from './LandingHeroFixtureFrame';
import {
  LANDING_BROWSER_TAB_TITLE,
  landingBrowserChromePath,
} from '../../lib/landing-browser-chrome';

export function LandingHeroProductPreview() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-[min(100%,520px)] overflow-hidden lg:mx-0 lg:max-w-full xl:max-w-[500px]"
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
              className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] text-ink-3 sm:ml-3 sm:px-3 sm:py-1 sm:text-[11px]"
              title={landingWickerReportPath}
            >
              <span className="shrink-0 font-medium text-ink-2">{LANDING_BROWSER_TAB_TITLE}</span>
              <span className="min-w-0 truncate tabular-nums">{landingBrowserChromePath(landingWickerReportPath)}</span>
            </div>
          </div>
          <LandingHeroFixtureFrame />
        </div>
        <div className="mt-3 text-center text-meta lg:text-left">
          <p className="text-ink-3">Sample report: Wicker Park, Chicago</p>
          <p className="mt-0.5 font-medium text-ink underline decoration-accent underline-offset-2 group-hover:decoration-2">
            Open Wicker Park report
          </p>
        </div>
      </Link>
    </div>
  );
}
