import { useEffect, useState } from 'react';
import type { OwnerUpdateSnapshot } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import {
  fetchOwnerUpdatePreview,
  fetchOwnerUpdateProperties,
  shareOwnerUpdate,
} from '../../lib/owner-update-api';

export function OwnerUpdatePanel({ embedded = false }: { embedded?: boolean }) {
  const [properties, setProperties] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState<OwnerUpdateSnapshot | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOwnerUpdateProperties().then((list) => {
      setProperties(list);
      if (list[0] && !selected) setSelected(list[0]);
    });
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }
    setLoading(true);
    setError(null);
    setShareUrl(null);
    void fetchOwnerUpdatePreview(selected)
      .then(setPreview)
      .catch(() => setError('Could not build preview for this property.'))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <section
      className={
        embedded
          ? 'px-6 py-6 md:px-8 md:py-7'
          : 'mt-10 rounded-[1.25rem] border border-border bg-surface p-6 md:p-7'
      }
      data-testid="owner-update-panel"
    >
      <h2 className="font-display text-title font-semibold tracking-tight text-ink">Owner update</h2>
      <p className="mt-2 text-body leading-relaxed text-ink-2">
        One-page status for the landlord: brands contacted, pipeline stage, and next steps from your real cards.
      </p>

      {properties.length === 0 ? (
        <p className="mt-4 text-body text-ink-2" data-testid="owner-update-empty">
          Add prospects to the pipeline from a report to generate an owner update.
        </p>
      ) : (
        <>
          <label className="mt-4 block text-sm">
            <span className="text-label uppercase text-ink-3">Property</span>
            <select
              className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-ink"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              data-testid="owner-update-property"
            >
              {properties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          {loading && <p className="mt-4 text-sm text-ink-2">Building preview…</p>}
          {error && <p className="mt-4 text-sm text-warn" role="alert">{error}</p>}

          {preview && !loading && (
            <div className="mt-4 space-y-3 text-sm text-ink-2" data-testid="owner-update-preview">
              <p className="text-ink">
                <span className="font-medium">{preview.propertyAddress}</span>
                {preview.propertyNeighborhood ? ` · ${preview.propertyNeighborhood}` : ''}
              </p>
              <p>{preview.brandsContacted} brands in your pipeline for this site.</p>
              <ul className="space-y-2">
                {preview.brands.map((row) => (
                  <li key={row.brandEntityId} className="rounded-control border border-border px-3 py-2">
                    <p className="font-medium text-ink">{row.brandName}</p>
                    <p className="text-ink-3">{row.prospectStatusLabel}</p>
                    <p className="mt-1 text-ink-2">{row.nextStep}</p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  data-testid="owner-update-share"
                  onClick={() => {
                    void shareOwnerUpdate(selected).then(({ id }) => {
                      const url = `${window.location.origin}/owner-update/${id}`;
                      setShareUrl(url);
                      void navigator.clipboard.writeText(url);
                    });
                  }}
                >
                  Create share link
                </Button>
                {shareUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open shared page
                  </Button>
                )}
              </div>
              {shareUrl && (
                <p className="text-xs text-ink-3">Link copied: {shareUrl}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
