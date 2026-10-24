export const pipelineEmptyLine =
  'No prospects saved yet. Add brands from a site report when you are ready to track outreach yourself.';
export const pipelineEmptyAction = 'Run a site analysis';

export const portfolioEmptyLine =
  'Add storefront addresses to compare local shopper match and hit rates across your book.';
export const portfolioEmptyAction = 'Add your first address';

export const watchlistEmptyLine =
  'No saved spaces yet. Open a site report and choose Watch this space when you want to track changes.';
export const watchlistEmptyAction = 'Run a site analysis';

export function reportShortListLine(count: number, radiusKm: number): string {
  if (count === 0) {
    return `No brands passed store checks within ${radiusKm} km. Try a wider radius or another category.`;
  }
  if (count === 1) {
    return 'Only one brand cleared store checks here. You can still pitch it, or widen the search for more options.';
  }
  return 'Only two brands cleared store checks here. Widen the radius if you want a longer pitch list.';
}

export const reportShortListWidenAction = 'Try 15 km radius';
export const reportShortListCategoryAction = 'Pick a category on home';

export const notFoundLine =
  'This link does not match a page in LeaseUp. Head back to search for tenants.';
export const shareLinkExpiredLine =
  'This shared link is missing or expired. Ask the sender for a fresh link, or run a new site search from home.';
