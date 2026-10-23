import { WatchRunSnapshotSchema } from '@leaseup/contracts';
import { diffWatchSnapshots } from '@leaseup/fixtures';
import beforeJson from '@leaseup/fixtures/watch-demo/snapshot-before.json';
import afterJson from '@leaseup/fixtures/watch-demo/snapshot-after.json';
import { WatchDiffPanel } from '../components/watchlist/WatchDiffPanel';

const DEMO_RADIUS_KM = 10;

export function WatchlistDiffPreviewPage() {
  const before = WatchRunSnapshotSchema.parse(beforeJson);
  const after = WatchRunSnapshotSchema.parse(afterJson);
  const diff = diffWatchSnapshots(before, after, DEMO_RADIUS_KM);

  return (
    <div className="min-h-screen bg-bg px-4 py-10" data-testid="watchlist-diff-preview">
      <div className="mx-auto max-w-[640px]">
        <p className="text-label uppercase tracking-wide text-ink-3">Demo data</p>
        <h1 className="mt-1 font-display font-semibold text-2xl text-ink">Watchlist change example</h1>
        <p className="mt-2 text-sm text-ink-2">
          Two saved analyze runs from demo fixtures. This page is for screenshots only.
        </p>
        <div className="mt-6">
          <WatchDiffPanel diff={diff} />
        </div>
      </div>
    </div>
  );
}
