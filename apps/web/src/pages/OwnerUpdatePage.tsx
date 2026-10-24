import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { OwnerUpdateSnapshot } from '@leaseup/contracts';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { fetchSharedOwnerUpdate } from '../lib/owner-update-api';
import { formatUserFacingDate } from '../lib/format-date';
import { shareLinkExpiredLine } from '../lib/empty-state-copy';

export function OwnerUpdatePage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<OwnerUpdateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchSharedOwnerUpdate(id)
      .then(setSnapshot)
      .catch(() => setError(shareLinkExpiredLine));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-24 text-center" data-testid="owner-update-error">
        <h1 className="font-display font-semibold text-h2 text-ink">Update unavailable</h1>
        <p className="mt-3 text-ink-2">{error}</p>
        <Link to="/pipeline" className="mt-6 inline-block">
          <Button>Back to pipeline</Button>
        </Link>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-bg px-4 py-24 text-center text-ink-2" data-testid="owner-update-loading">
        Loading owner update…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg owner-update-print print-owner-page" data-testid="owner-update-page">
      <header className="no-print border-b border-border bg-surface/90 px-4 py-4">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
          <Link to="/" className="text-ink" aria-label="LeaseUp home">
            <Logo variant="lockup" size="sm" />
          </Link>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 py-10 print:py-4">
        <p className="text-label uppercase tracking-wide text-ink-3">Owner update</p>
        <h1 className="mt-2 font-display font-semibold text-display text-ink break-words">
          {snapshot.propertyNeighborhood ?? 'Property'}
        </h1>
        <p className="mt-2 text-lg text-ink-2 break-words">{snapshot.propertyAddress}</p>
        <p className="mt-1 text-sm text-ink-3">
          Snapshot {formatUserFacingDate(snapshot.createdAt)} · pipeline as of{' '}
          {formatUserFacingDate(snapshot.pipelineUpdatedAt)}
        </p>

        {snapshot.brands.length === 0 ? (
          <p className="mt-8 text-ink-2" data-testid="owner-update-empty">
            No brands in the pipeline for this property yet.
          </p>
        ) : (
          <ol className="mt-8 space-y-4">
            {snapshot.brands.map((row, index) => (
              <li key={row.brandEntityId} className="border-b border-border pb-4 last:border-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm text-ink-3">#{index + 1}</span>
                  <h2 className="font-display font-semibold text-xl text-ink">{row.brandName}</h2>
                </div>
                <p className="mt-1 text-sm text-ink-2">
                  {row.prospectStatusLabel}
                  {row.followUpAt ? ` · follow up ${formatUserFacingDate(row.followUpAt)}` : ''}
                </p>
                <p className="mt-2 text-ink">{row.nextStep}</p>
                {row.notes && <p className="mt-2 text-sm text-ink-2">Notes: {row.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
