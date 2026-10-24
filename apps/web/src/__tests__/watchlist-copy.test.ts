import { describe, expect, it } from 'vitest';
import { watchDiffIntro, WATCH_FIRST_CHECK_COPY, WATCH_NO_CHANGES_COPY } from '../lib/watchlist-copy';

describe('watchlist copy', () => {
  it('uses first check message', () => {
    expect(
      watchDiffIntro({
        kind: 'first_check',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [],
      })
    ).toBe(WATCH_FIRST_CHECK_COPY);
  });

  it('uses no changes message', () => {
    expect(
      watchDiffIntro({
        kind: 'no_changes',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [],
      })
    ).toBe(WATCH_NO_CHANGES_COPY);
  });
});
