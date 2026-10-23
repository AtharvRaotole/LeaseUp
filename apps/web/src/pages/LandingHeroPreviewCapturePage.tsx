import { LandingHeroFixtureFrame } from '../components/landing/LandingHeroFixtureFrame';

/** Static route for scripts/generate-landing-hero-preview.mjs only (fixture slice, no browser chrome). */
export function LandingHeroPreviewCapturePage() {
  return (
    <div className="inline-block bg-bg p-0">
      <LandingHeroFixtureFrame capture />
    </div>
  );
}
