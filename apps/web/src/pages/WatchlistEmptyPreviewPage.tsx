import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { buttonClassName } from '../components/ui/Button';
import { PageEmptyState } from '../components/ui/PageEmptyState';
import { PreviewSampleBanner } from '../components/layout/PreviewSampleBanner';
import { watchlistEmptyAction, watchlistEmptyLine } from '../lib/empty-state-copy';

/** Static route for empty watchlist screenshots (no API). */
export function WatchlistEmptyPreviewPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8" data-testid="watchlist-page">
      <PreviewSampleBanner />
      <p className="mt-4 text-label uppercase tracking-wide text-ink-3">Broker tools</p>
      <h1 className="mt-1 font-display font-semibold text-display text-ink">Watchlist</h1>
      <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-border bg-surface-2">
        <PageEmptyState icon={Bookmark} title="No saved spaces yet" testId="watchlist-empty">
          <p>{watchlistEmptyLine}</p>
          <Link to="/" className={buttonClassName({ className: 'mt-6' })}>
            {watchlistEmptyAction}
          </Link>
        </PageEmptyState>
      </div>
    </div>
  );
}
