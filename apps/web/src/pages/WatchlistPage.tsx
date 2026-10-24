import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import type { WatchSpaceDetail, WatchSpaceSummary } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { PageEmptyState } from '../components/ui/PageEmptyState';
import { WatchDiffPanel } from '../components/watchlist/WatchDiffPanel';
import {
  fetchWatchDetail,
  fetchWatchlist,
  recheckWatchSpace,
  removeWatchSpace,
  WatchlistApiError,
} from '../lib/watchlist-api';
import { formatUserFacingDate } from '../lib/format-date';
import {
  watchlistEmptyAction,
  watchlistEmptyLine,
  watchlistLoadErrorLine,
  watchlistSpaceLoadErrorLine,
} from '../lib/empty-state-copy';

export function WatchlistPage() {
  const { watchId } = useParams();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<WatchSpaceSummary[]>([]);
  const [detail, setDetail] = useState<WatchSpaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchWatchlist();
      setSpaces(data.spaces);
      setError(null);
    } catch {
      setError(watchlistLoadErrorLine);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await fetchWatchDetail(id));
      setError(null);
    } catch {
      setError(watchlistSpaceLoadErrorLine);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (watchId) void loadDetail(watchId);
    else setDetail(null);
  }, [watchId, loadDetail]);

  const onRemove = async (id: string) => {
    setRemoving(true);
    try {
      await removeWatchSpace(id);
      setDetail(null);
      await loadList();
      setError(null);
      navigate('/watchlist', { replace: true });
    } catch (err) {
      setError(err instanceof WatchlistApiError ? err.message : 'Could not remove this space.');
    } finally {
      setRemoving(false);
    }
  };

  const onRecheck = async (id: string) => {
    setRechecking(true);
    try {
      const next = await recheckWatchSpace(id);
      setDetail(next);
      await loadList();
      setError(null);
    } catch (err) {
      if (err instanceof WatchlistApiError) {
        setError(err.message);
      } else {
        setError('Recheck did not finish. Try again in a moment.');
      }
    } finally {
      setRechecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg" data-testid="watchlist-page">
      <TopBar />
      <div className="mx-auto max-w-[880px] px-4 py-8 md:px-6">
        <p className="text-label uppercase tracking-wide text-ink-3">Broker tools</p>
        <h1 className="mt-1 font-display font-semibold text-display text-ink">Watchlist</h1>
        <p className="mt-2 text-sm text-ink-2">
          Saved addresses from your reports on this browser. Recheck runs a fresh analyze and compares it to
          your last saved snapshot.
        </p>

        {error && <p className="mt-4 text-sm text-ink-2" role="alert">{error}</p>}

        {watchId && detail ? (
          <div className="mt-8 space-y-4">
            <Link to="/watchlist" className="text-sm text-accent underline-offset-2 hover:underline">
              Back to all spaces
            </Link>
            <div className="rounded-card border border-border bg-surface px-5 py-5">
              <h2 className="font-display font-semibold text-xl text-ink">{detail.address}</h2>
              <p className="mt-1 text-sm text-ink-3">
                {detail.radiusKm} km trade area · Last checked{' '}
                {formatUserFacingDate(detail.lastCheckedAt)} · {detail.snapshotCount} saved run
                {detail.snapshotCount === 1 ? '' : 's'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  data-testid="watch-recheck"
                  disabled={rechecking || removing}
                  onClick={() => void onRecheck(detail.watchId)}
                >
                  {rechecking ? 'Running analyze…' : 'Recheck now'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  data-testid="watch-remove"
                  disabled={rechecking || removing}
                  onClick={() => void onRemove(detail.watchId)}
                >
                  {removing ? 'Removing…' : 'Remove'}
                </Button>
              </div>
              {detail.diff && (
                <div className="mt-4">
                  <WatchDiffPanel diff={detail.diff} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            {spaces.length === 0 && !error ? (
              <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface-2">
                <PageEmptyState icon={Bookmark} title="No saved spaces yet" testId="watchlist-empty">
                  <p>{watchlistEmptyLine}</p>
                  <Link to="/" className="mt-6 inline-block">
                    <Button type="button" variant="primary" size="md">{watchlistEmptyAction}</Button>
                  </Link>
                </PageEmptyState>
              </div>
            ) : (
          <ul className="space-y-3" data-testid="watchlist-spaces">
            {spaces.map((space) => (
              <li key={space.watchId}>
                <Link
                  to={`/watchlist/${space.watchId}`}
                  className="block rounded-card border border-border bg-surface px-4 py-3 hover:border-border-strong"
                  data-testid="watchlist-space-link"
                >
                  <p className="font-medium text-ink">{space.address}</p>
                  <p className="mt-1 text-sm text-ink-3">
                    {space.radiusKm} km · {space.snapshotCount} run{space.snapshotCount === 1 ? '' : 's'} ·
                    Last checked {formatUserFacingDate(space.lastCheckedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
