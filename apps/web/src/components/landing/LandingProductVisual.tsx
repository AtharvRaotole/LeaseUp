import { Link } from 'react-router-dom';
import { LandingReveal } from './LandingReveal';
import { LandingReportPreview, landingWickerReportPath } from './LandingReportPreview';
import {
  LANDING_BROWSER_TAB_TITLE,
  landingBrowserChromePath,
} from '../../lib/landing-browser-chrome';

export function LandingProductVisual() {
  return (
    <section
      aria-label="Product preview"
      className="relative border-t border-border bg-bg pb-14 pt-10 md:pb-16 md:pt-12"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--surface-2)]/80 to-transparent" />
      <LandingReveal className="mx-auto max-w-[1080px] px-4">
        <div className="relative mx-auto max-w-[920px]">
          <div
            className="absolute -left-2 top-8 hidden h-[88%] w-[96%] rounded-xl border border-accent/20 bg-accent-soft/40 md:block"
            aria-hidden
            style={{ transform: 'rotate(2.5deg)' }}
          />
          <div
            className="relative overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_24px_60px_-12px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_70px_-16px_rgba(0,0,0,0.65)]"
            style={{ transform: 'rotate(-1.25deg)' }}
          >
            <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
              <div className="ml-3 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-1 text-[11px] text-ink-3">
                <span className="shrink-0 font-medium text-ink-2">{LANDING_BROWSER_TAB_TITLE}</span>
                <span className="min-w-0 truncate tabular-nums">{landingBrowserChromePath(landingWickerReportPath)}</span>
              </div>
            </div>
            <LandingReportPreview />
          </div>
          <p className="mt-6 text-center text-sm text-ink-2">
            Recorded Wicker Park demo: ranked pitch list and map from fixture data.{' '}
            <Link
              to={landingWickerReportPath}
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            >
              Open the live report
            </Link>
          </p>
        </div>
      </LandingReveal>
    </section>
  );
}
