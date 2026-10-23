import type { ApiErrorInfo } from './api-error';

export const SERVER_BUSY_HEADLINE = 'Our servers are busy';
export const SERVER_BUSY_MESSAGE =
  'We could not reach the server just now. Your address is still here when you try again.';
export const AUTO_RETRY_STATUS = 'Our servers are busy. Trying again...';

export function calmErrorHeadline(info: ApiErrorInfo): string {
  if (info.code === 'RATE_LIMIT_EXCEEDED') return 'Too many searches at once';
  if (info.code === 'SERVER_BUSY' || info.code === 'NETWORK_ERROR') return SERVER_BUSY_HEADLINE;
  if (info.code === 'NOT_FOUND') return 'We could not find that page';
  return 'Something did not load';
}

export function calmErrorNextStep(info: ApiErrorInfo): string {
  if (info.code === 'RATE_LIMIT_EXCEEDED') {
    return 'Wait a minute, then tap Try again or pick a demo example on the home page.';
  }
  if (info.code === 'SERVER_BUSY' || info.code === 'NETWORK_ERROR') {
    return 'Check your connection, or pick a demo example on the home page while we catch up.';
  }
  if (info.code === 'NOT_FOUND') {
    return 'Open the home page and start a new site search.';
  }
  return 'Try again in a moment, or go back to the home page.';
}
