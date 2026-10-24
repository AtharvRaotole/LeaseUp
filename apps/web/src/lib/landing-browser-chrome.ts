/** Decorative browser chrome on marketing mocks (no invented production domain). */
export const LANDING_BROWSER_TAB_TITLE = 'LeaseUp';

/** Path-only address bar label, trimmed for narrow layouts. */
export function landingBrowserChromePath(pathAndQuery: string, maxLen = 52): string {
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  if (path.length <= maxLen) return path;
  return `${path.slice(0, maxLen - 1)}…`;
}
