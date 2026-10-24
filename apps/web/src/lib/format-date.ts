/** User-facing calendar date in the viewer's local time zone. */
export function formatUserFacingDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

export function isSameUserFacingCalendarDay(iso: string, when: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === when.getFullYear() &&
    d.getMonth() === when.getMonth() &&
    d.getDate() === when.getDate()
  );
}
