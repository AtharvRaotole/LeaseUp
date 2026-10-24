import type { BrandReachContact } from '@leaseup/contracts';
import { brandReachLinkHostname, brandReachPlainLine } from '../../lib/brand-reach-copy';

export function BrandReachLine({ reach }: { reach: BrandReachContact }) {
  const text = brandReachPlainLine(reach);
  if (reach.status === 'verified' && reach.url) {
    const hostname = brandReachLinkHostname(reach.url);
    return (
      <p className="text-sm text-ink-2" data-testid="brand-reach-line">
        How to reach them:{' '}
        <a
          href={reach.url}
          className="text-accent underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {hostname}
        </a>
      </p>
    );
  }

  return (
    <p className="text-sm text-ink-2" data-testid="brand-reach-line">
      {text}
    </p>
  );
}
