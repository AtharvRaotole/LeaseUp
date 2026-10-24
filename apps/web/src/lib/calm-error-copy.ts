import type { ApiErrorInfo } from './api-error';

export const SERVER_BUSY_HEADLINE = 'Our servers are busy';
export const SERVER_BUSY_MESSAGE =
  'We could not reach the server just now. Your address is still here when you try again.';
export const AUTO_RETRY_STATUS = 'Our servers are busy. Trying again...';

export const DAILY_LIMIT_HEADLINE = 'Daily search limit reached';

/** Next 00:00 UTC, when the shared daily live search limit resets. */
export function nextDailyLimitReset(nowMs = Date.now()): Date {
  const now = new Date(nowMs);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function formatWait(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Plain copy for the daily live search cap, with the reset time in the reader's own zone. */
export function dailyLimitMessage(nowMs = Date.now(), timeZone?: string): string {
  const reset = nextDailyLimitReset(nowMs);
  const time = reset.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
  return (
    `New address searches have hit today's limit. ` +
    `The limit resets at ${time} (midnight UTC), in about ${formatWait(reset.getTime() - nowMs)}.`
  );
}

export function calmErrorHeadline(info: ApiErrorInfo): string {
  if (info.code === 'DAILY_LIMIT_REACHED') return DAILY_LIMIT_HEADLINE;
  if (info.code === 'RATE_LIMIT_EXCEEDED') return 'Too many searches at once';
  if (info.code === 'SERVER_BUSY' || info.code === 'NETWORK_ERROR') return SERVER_BUSY_HEADLINE;
  if (info.code === 'NOT_FOUND') return 'We could not find that page';
  if (info.code === 'GEOCODE_PO_BOX') return 'PO boxes cannot be mapped';
  if (info.code === 'GEOCODE_NON_US') return 'US storefronts only';
  if (info.code === 'GEOCODE_UNRECOGNIZED') return 'Address not recognized';
  if (info.code === 'GEOCODE_NOT_FOUND') return 'Address not found';
  if (info.code === 'GEOCODE_TIMEOUT' || info.code === 'GEOCODE_UPSTREAM_ERROR') {
    return 'Address lookup timed out';
  }
  if (info.code === 'QLOO_UNAVAILABLE') return 'Taste data is slow';
  return 'Something did not load';
}

export function calmErrorNextStep(info: ApiErrorInfo): string {
  if (info.code === 'DAILY_LIMIT_REACHED') {
    return 'The three demo reports on the home page still open. Come back after the reset to search a new address.';
  }
  if (info.code === 'RATE_LIMIT_EXCEEDED') {
    return 'Wait a minute, then tap Try again or pick a demo example on the home page.';
  }
  if (info.code === 'SERVER_BUSY' || info.code === 'NETWORK_ERROR') {
    return 'Check your connection, or pick a demo example on the home page while we catch up.';
  }
  if (info.code === 'NOT_FOUND') {
    return 'Open the home page and start a new site search.';
  }
  if (info.code === 'GEOCODE_PO_BOX') {
    return 'Type the street address of the retail space, including suite number if you have one.';
  }
  if (info.code === 'GEOCODE_NON_US') {
    return 'Use a United States address, or pick one of the demo storefronts on the home page.';
  }
  if (info.code === 'GEOCODE_UNRECOGNIZED') {
    return 'Include street number, city, and state (for example 123 Main St, Austin, TX 78701).';
  }
  if (info.code === 'GEOCODE_NOT_FOUND') {
    return 'Double-check the storefront address, or pick a demo example on the home page.';
  }
  if (info.code === 'GEOCODE_TIMEOUT' || info.code === 'GEOCODE_UPSTREAM_ERROR') {
    return 'Wait a few seconds and tap Try again, or edit the address if something looks off.';
  }
  if (info.code === 'QLOO_UNAVAILABLE') {
    return 'Wait about thirty seconds, then tap Try again. Your typed address stays on this page.';
  }
  return 'Try again in a moment, or go back to the home page.';
}
