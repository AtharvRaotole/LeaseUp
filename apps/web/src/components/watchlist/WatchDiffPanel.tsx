import type { WatchDiffResult } from '@leaseup/contracts';
import { displayBrandName } from '../../lib/brand-display';
import { watchDiffIntro } from '../../lib/watchlist-copy';

function BrandList({ title, names }: { title: string; names: { entityId: string; name: string }[] }) {
  if (names.length === 0) return null;
  return (
    <section className="mt-4" data-testid={`watch-diff-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
        {names.map((row) => (
          <li key={row.entityId}>{displayBrandName(row.entityId, row.name)}</li>
        ))}
      </ul>
    </section>
  );
}

export function WatchDiffPanel({ diff }: { diff: WatchDiffResult }) {
  const intro = watchDiffIntro(diff);
  const showLists = diff.kind === 'changes';

  return (
    <div className="rounded-card border border-border bg-surface px-4 py-4" data-testid="watch-diff-panel">
      <p className="text-sm text-ink">{intro}</p>
      {showLists && (
        <>
          <BrandList title="New store opened nearby" names={diff.newlyOpenedStore} />
          <BrandList title="New in top 10" names={diff.newInTop10} />
          <BrandList title="Dropped out of top 10" names={diff.droppedFromTop10} />
        </>
      )}
    </div>
  );
}
