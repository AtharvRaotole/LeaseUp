import type { BrandReachContact } from '@leaseup/contracts';
import { brandReachPlainLine } from '../../lib/brand-reach-copy';

export function BrandReachLine({ reach }: { reach: BrandReachContact }) {
  const text = brandReachPlainLine(reach);
  if (reach.status === 'verified' && reach.url) {
    return (
      <p className="text-sm text-ink-2" data-testid="brand-reach-line">
        How to reach them:{' '}
        <a
          href={reach.url}
          className="text-accent underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Official real-estate page
        </a>
        <span className="text-ink-3"> (source: {reach.source ?? reach.url})</span>
      </p>
    );
  }

  return (
    <p className="text-sm text-ink-2" data-testid="brand-reach-line">
      {text}
    </p>
  );
}
