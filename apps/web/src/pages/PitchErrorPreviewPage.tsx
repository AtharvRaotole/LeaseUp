import { Link } from 'react-router-dom';
import { buttonClassName } from '../components/ui/Button';
import { PreviewSampleBanner } from '../components/layout/PreviewSampleBanner';
import { shareLinkExpiredLine } from '../lib/empty-state-copy';

/** Static route for pitch unavailable screenshots (no API). */
export function PitchErrorPreviewPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-24 text-center" data-testid="pitch-error">
      <div className="mx-auto max-w-md px-4">
        <PreviewSampleBanner />
      </div>
      <h1 className="mt-6 font-display font-semibold text-h2 text-ink">Pitch unavailable</h1>
      <p className="mt-3 mx-auto max-w-md text-ink-2">{shareLinkExpiredLine}</p>
      <Link to="/" className={buttonClassName({ size: 'lg', className: 'mt-6' })}>
        Back to home
      </Link>
    </div>
  );
}
