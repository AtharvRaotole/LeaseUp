/** User-facing calendar date in the viewer's local time zone. */
export function formatUserFacingDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}
