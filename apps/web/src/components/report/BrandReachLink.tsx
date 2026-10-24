import type { BrandReachContact } from '@leaseup/contracts';

export function BrandReachLink({ reach }: { reach: BrandReachContact }) {
  if (reach.status === 'verified' && reach.url) {
    return (
      <p className="text-sm text-ink-2">
        How to reach them:{' '}
        <a
          href={reach.url}
          className="font-medium text-brand underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Official real estate page
        </a>
      </p>
    );
  }

  if (reach.status === 'not_yet_found' && reach.searchUrl) {
    return (
      <p className="text-sm text-ink-2">
        How to reach them:{' '}
        <a
          href={reach.searchUrl}
          className="font-medium text-brand underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Search for their real estate contact
        </a>
      </p>
    );
  }

  return null;
}
