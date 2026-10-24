import type { WatchDiffResult } from '@leaseup/contracts';

export const WATCH_FIRST_CHECK_COPY =
  "First check saved. We'll show changes next time.";

export const WATCH_NO_CHANGES_COPY = 'No changes in the top 10 since your last check.';

export function watchDiffIntro(diff: WatchDiffResult): string {
  if (diff.kind === 'first_check') return WATCH_FIRST_CHECK_COPY;
  if (diff.kind === 'no_changes') return WATCH_NO_CHANGES_COPY;
  return 'Changes since your last check:';
}
