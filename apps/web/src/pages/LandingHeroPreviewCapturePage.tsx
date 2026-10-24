import { PreviewSampleBanner } from '../components/layout/PreviewSampleBanner';
import { LandingHeroFixtureFrame } from '../components/landing/LandingHeroFixtureFrame';

/** Static route for scripts/generate-landing-hero-preview.mjs only (fixture slice, no browser chrome). */
export function LandingHeroPreviewCapturePage() {
  return (
    <div className="inline-block bg-bg p-0">
      <div className="p-2">
        <PreviewSampleBanner />
      </div>
      <LandingHeroFixtureFrame capture />
    </div>
  );
}
