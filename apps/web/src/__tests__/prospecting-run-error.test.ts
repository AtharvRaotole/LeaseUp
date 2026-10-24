import { describe, expect, it } from 'vitest';
import { DAILY_LIMIT_HEADLINE, calmErrorHeadline, dailyLimitMessage } from '../lib/calm-error-copy';
import {
  PROSPECTING_START_FAILED,
  PROSPECTING_STOPPED_EARLY,
  prospectingRunError,
} from '../lib/prospecting-run-error';

const NOW = Date.UTC(2026, 9, 24, 21, 0, 0);

describe('prospectingRunError', () => {
  it('shows the daily limit copy when the cap is hit mid-run', () => {
    const err = prospectingRunError(
      { code: 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED', message: 'Daily live Qloo analyze limit reached for this worker.' },
      'stream',
      NOW,
    );
    expect(err.code).toBe('DAILY_LIMIT_REACHED');
    expect(calmErrorHeadline(err)).toBe(DAILY_LIMIT_HEADLINE);
    expect(err.message).toBe(dailyLimitMessage(NOW));
    expect(err.message).toMatch(/resets at .+ \(midnight UTC\)/);
  });

  it('matches the pre-start daily limit copy exactly', () => {
    const start = prospectingRunError({ code: 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED' }, 'start', NOW);
    const stream = prospectingRunError({ code: 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED' }, 'stream', NOW);
    expect(stream).toEqual(start);
  });

  it('keeps other failures on the calm generic copy', () => {
    expect(prospectingRunError(null, 'start', NOW)).toEqual({ code: 'SERVER_BUSY', message: PROSPECTING_START_FAILED });
    expect(prospectingRunError({}, 'stream', NOW)).toEqual({ code: 'SERVER_BUSY', message: PROSPECTING_STOPPED_EARLY });
    expect(prospectingRunError({ code: 'INTERNAL_ERROR', message: 'Boom' }, 'stream', NOW).message).toBe('Boom');
  });
});
