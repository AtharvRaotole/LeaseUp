import { LandingHeroFixtureFrame } from '../components/landing/LandingHeroFixtureFrame';

/** Static route for scripts/generate-landing-hero-preview.mjs only. */
export function LandingHeroPreviewCapturePage() {
  return (
    <div className="min-h-screen bg-bg p-6" data-theme="light">
      <div
        className="mx-auto max-w-[720px] overflow-hidden rounded-xl border border-border-strong bg-surface shadow-sm"
        id="landing-hero-capture-shell"
      >
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
          <div className="ml-3 flex-1 truncate rounded-md border border-border bg-surface px-3 py-1 text-[11px] text-ink-3">
            leaseup.app/r/wicker
          </div>
        </div>
        <LandingHeroFixtureFrame />
      </div>
    </div>
  );
}
