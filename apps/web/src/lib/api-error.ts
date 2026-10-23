import { isNetworkFetchError, isRetryableHttpStatus } from './fetch-with-retry';
import { SERVER_BUSY_MESSAGE } from './calm-error-copy';

export type ApiErrorInfo = {
  message: string;
  code?: string;
  retryAfterSec?: number;
  autoRetried?: boolean;
};

export function humanizeApiError(status: number, body: { error?: string; code?: string; retryAfter?: number }): ApiErrorInfo {
  const code = body.code;
  if (code === 'GEOCODE_NOT_FOUND') {
    return {
      message:
        body.error?.trim() ||
        'We could not find that street address. Use a retail storefront with city and state.',
      code: 'GEOCODE_NOT_FOUND',
    };
  }
  if (code === 'QLOO_UNAVAILABLE') {
    return {
      message: body.error?.trim() || 'Taste data is slow right now. Try again in a moment.',
      code: 'QLOO_UNAVAILABLE',
      retryAfterSec: 30,
    };
  }
  if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return {
      message: 'Lots of searches right now. Try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSec: typeof body.retryAfter === 'number' ? body.retryAfter : 60,
    };
  }
  if (
    status === 503 ||
    code === 'SERVER_BUSY' ||
    code === 'CONFIGURATION_ERROR' ||
    code === '1102' ||
    String(body.error ?? '').includes('1102')
  ) {
    return {
      message: SERVER_BUSY_MESSAGE,
      code: 'SERVER_BUSY',
    };
  }
  if (status >= 500) {
    return {
      message: SERVER_BUSY_MESSAGE,
      code: 'SERVER_BUSY',
    };
  }
  if (status === 404) {
    return { message: 'We could not find that resource.', code };
  }
  const raw = body.error?.trim();
  if (raw && /qloo api fetch error/i.test(raw)) {
    return {
      message: 'Taste data is slow right now. Try again in a moment.',
      code: 'QLOO_UNAVAILABLE',
      retryAfterSec: 30,
    };
  }
  if (!raw || /^too many requests$/i.test(raw)) {
    return {
      message: 'Lots of searches right now. Try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSec: 60,
    };
  }
  return { message: raw, code };
}

export function apiErrorFromNetworkFailure(autoRetried = false): ApiErrorInfo {
  return {
    message: SERVER_BUSY_MESSAGE,
    code: 'NETWORK_ERROR',
    autoRetried,
  };
}

export function apiErrorFromFailedResponse(response: Response, autoRetried = false): ApiErrorInfo {
  if (isRetryableHttpStatus(response.status)) {
    return { message: SERVER_BUSY_MESSAGE, code: 'SERVER_BUSY', autoRetried };
  }
  return {
    message: SERVER_BUSY_MESSAGE,
    code: 'SERVER_BUSY',
    autoRetried,
  };
}

export function apiErrorFromUnknown(err: unknown, autoRetried = false): ApiErrorInfo {
  if (isNetworkFetchError(err)) return apiErrorFromNetworkFailure(autoRetried);
  if (err && typeof err === 'object' && 'message' in err) {
    const raw = String((err as ApiErrorInfo).message);
    if (/failed to fetch|cors|network/i.test(raw)) {
      return apiErrorFromNetworkFailure(autoRetried);
    }
    return { message: raw, code: (err as ApiErrorInfo).code, autoRetried };
  }
  return { message: SERVER_BUSY_MESSAGE, code: 'SERVER_BUSY', autoRetried };
}

export async function parseApiErrorResponse(response: Response): Promise<ApiErrorInfo> {
  const headerRetry = response.headers.get('Retry-After');
  const headerSec = headerRetry ? Number.parseInt(headerRetry, 10) : undefined;
  const body = await response.json().catch(() => ({})) as { error?: string; code?: string; retryAfter?: number };
  const info = humanizeApiError(response.status, body);
  if (headerSec && Number.isFinite(headerSec)) {
    info.retryAfterSec = headerSec;
  }
  return info;
}
