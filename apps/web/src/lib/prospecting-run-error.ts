import type { ApiErrorInfo } from './api-error';
import { dailyLimitMessage } from './calm-error-copy';

export const PROSPECTING_START_FAILED = 'We could not start this agent run. Try again in a moment.';
export const PROSPECTING_STOPPED_EARLY = 'This prospecting run stopped early. Try again in a moment.';

const DAILY_LIMIT_CODES = new Set(['LIVE_QLOO_JUDGE_QUOTA_EXCEEDED', 'DAILY_LIMIT_REACHED']);

/**
 * One mapping for both ways a prospecting run can fail: the start request itself, or an
 * error event after the stream began. The daily cap reads the same either way.
 */
export function prospectingRunError(
  payload: { code?: string; message?: string } | null | undefined,
  phase: 'start' | 'stream',
  nowMs = Date.now(),
): ApiErrorInfo {
  if (payload?.code && DAILY_LIMIT_CODES.has(payload.code)) {
    return { code: 'DAILY_LIMIT_REACHED', message: dailyLimitMessage(nowMs) };
  }
  if (phase === 'start') return { code: 'SERVER_BUSY', message: PROSPECTING_START_FAILED };
  return { code: 'SERVER_BUSY', message: payload?.message || PROSPECTING_STOPPED_EARLY };
}
