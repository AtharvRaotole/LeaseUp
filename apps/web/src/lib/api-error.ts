export type ApiErrorInfo = {
  message: string;
  code?: string;
  retryAfterSec?: number;
};

export function humanizeApiError(status: number, body: { error?: string; code?: string; retryAfter?: number }): ApiErrorInfo {
  const code = body.code;
  if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return {
      message: 'Lots of searches right now. Try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSec: typeof body.retryAfter === 'number' ? body.retryAfter : 60,
    };
  }
  if (status >= 500) {
    return {
      message:
        'Our servers could not finish this report. Your address is saved; wait a moment and try again.',
      code,
    };
  }
  if (status === 404) {
    return { message: 'We could not find that resource.', code };
  }
  const raw = body.error?.trim();
  if (!raw || /^too many requests$/i.test(raw)) {
    return {
      message: 'Lots of searches right now. Try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSec: 60,
    };
  }
  return { message: raw, code };
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
