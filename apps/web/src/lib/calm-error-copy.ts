import type { ApiErrorInfo } from './api-error';

export const SERVER_BUSY_HEADLINE = 'Our servers are busy';
export const SERVER_BUSY_MESSAGE =
  'We could not reach the server just now. Your address is still here when you try again.';
export const AUTO_RETRY_STATUS = 'Our servers are busy. Trying again...';

export function calmErrorHeadline(info: ApiErrorInfo): string {
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
