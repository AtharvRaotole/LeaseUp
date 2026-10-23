import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { saveWatchSpace } from '../../lib/watchlist-api';

export function WatchSpaceButton({
  address,
  radiusKm,
  analysis,
}: {
  address: string;
  radiusKm: number;
  analysis: AnalysisResponse;
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [watchId, setWatchId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        data-testid="watch-this-space"
        disabled={status === 'saving'}
        onClick={() => {
          setStatus('saving');
          void saveWatchSpace({ address, radiusKm, analysis })
            .then((res) => {
              setWatchId(res.watchId);
              setStatus('saved');
            })
            .catch(() => setStatus('error'));
        }}
      >
        {status === 'saving' ? 'Saving…' : 'Watch this space'}
      </Button>
      {status === 'saved' && watchId && (
        <Link
          to={`/watchlist/${watchId}`}
          className="text-sm text-accent underline-offset-2 hover:underline"
          data-testid="watch-saved-link"
        >
          On your watchlist
        </Link>
      )}
      {status === 'error' && (
        <span className="text-sm text-ink-3">Could not save. Try again.</span>
      )}
    </div>
  );
}
