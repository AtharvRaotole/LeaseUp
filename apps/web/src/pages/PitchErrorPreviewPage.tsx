import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { shareLinkExpiredLine } from '../lib/empty-state-copy';

/** Static route for pitch unavailable screenshots (no API). */
export function PitchErrorPreviewPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-24 text-center" data-testid="pitch-error">
      <h1 className="font-display font-semibold text-h2 text-ink">Pitch unavailable</h1>
      <p className="mt-3 mx-auto max-w-md text-ink-2">{shareLinkExpiredLine}</p>
      <Link to="/" className="mt-6 inline-block">
        <Button size="lg">Back to home</Button>
      </Link>
    </div>
  );
}
