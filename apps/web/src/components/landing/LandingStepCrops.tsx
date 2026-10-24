import { displayBrandName } from '../../lib/brand-display';
import { LANDING_WICKER_PREVIEW } from '../../data/landing-wicker-preview';
import { LANDING_PUBLIC_HOST } from '../../lib/landing-public-host';

/** Static UI crops for "How it works" (fixture data only, no network). */

export function AddressStepCrop() {
  return (
    <div
      className="overflow-hidden rounded-control border border-border bg-surface-2 p-3 text-left shadow-sm"
      aria-hidden
    >
      <p className="text-meta uppercase text-ink-3">Street address</p>
      <div className="mt-2 flex gap-2">
        <div className="h-10 flex-1 rounded-control border border-border bg-surface px-3 text-small leading-10 text-ink-2">
          1560 N Milwaukee Ave, Chicago
        </div>
        <div className="flex h-10 items-center rounded-control bg-accent px-4 text-small font-medium text-[var(--on-accent)]">
          Analyze
        </div>
      </div>
    </div>
  );
}

export function BrandsStepCrop() {
  const rows = LANDING_WICKER_PREVIEW.prospects.slice(0, 3);
  return (
    <div
      className="overflow-hidden rounded-control border border-border bg-surface text-left shadow-sm"
      aria-hidden
    >
      <p className="border-b border-border bg-surface-2 px-3 py-2 text-meta font-medium uppercase text-ink-3">
        Top brands to pitch
      </p>
      <ul className="divide-y divide-border">
        {rows.map((p, i) => (
          <li key={p.brand.entityId} className="px-3 py-2.5">
            <p className="text-small font-medium text-ink">
              #{i + 1} {displayBrandName(p.brand.entityId, p.brand.name)}
            </p>
            <p className="mt-0.5 text-meta text-ink-3">No store in your trade area</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PitchStepCrop() {
  return (
    <div
      className="overflow-hidden rounded-control border border-border bg-surface p-3 text-left shadow-sm"
      aria-hidden
    >
      <p className="text-small font-medium text-ink">Share pitch pack</p>
      <p className="mt-1 text-meta text-ink-3">Frozen snapshot with map and top brands</p>
      <div className="mt-3 flex gap-2">
        <div className="h-9 flex-1 rounded-control border border-border bg-surface-2 px-2 text-meta leading-9 text-ink-3">
          {LANDING_PUBLIC_HOST}/pitch/…
        </div>
        <div className="flex h-9 items-center rounded-control bg-accent px-3 text-meta font-medium text-[var(--on-accent)]">
          Copy link
        </div>
      </div>
    </div>
  );
}
