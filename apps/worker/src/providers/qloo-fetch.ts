import { UpstreamError } from '../lib/errors';

export const QLOO_FETCH_TOTAL_BUDGET_MS = 8_000;
export const QLOO_FETCH_MAX_RETRIES = 1;
export const QLOO_FETCH_PER_ATTEMPT_TIMEOUT_MS = 4_000;

export const QLOO_UNAVAILABLE_USER_MESSAGE =
  'Taste data is slow right now. Try again in a moment.';

export function qlooUnavailableError(cause?: string): UpstreamError {
  const err = new UpstreamError(cause ?? 'Qloo upstream unavailable', 503);
  err.code = 'QLOO_UNAVAILABLE';
  err.userMessage = QLOO_UNAVAILABLE_USER_MESSAGE;
  return err;
}

export function isRetryableQlooStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function jitteredBackoffMs(attempt: number, baseMs = 400): number {
  const cap = Math.min(baseMs * 2 ** attempt, 4_000);
  const jitter = Math.floor(Math.random() * 250);
  return cap + jitter;
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type QlooFetchFn = (
  url: string,
  init: RequestInit & { signal?: AbortSignal }
) => Promise<Response>;

/**
 * Retry transient Qloo failures (429, 5xx, network) within a total time budget.
 */
export async function fetchQlooWithRetry(
  url: string,
  apiKey: string,
  fetchImpl: QlooFetchFn = globalThis.fetch.bind(globalThis),
  options: {
    totalBudgetMs?: number;
    maxRetries?: number;
    perAttemptTimeoutMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {}
): Promise<Response> {
  const totalBudgetMs = options.totalBudgetMs ?? QLOO_FETCH_TOTAL_BUDGET_MS;
  const maxRetries = options.maxRetries ?? QLOO_FETCH_MAX_RETRIES;
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? QLOO_FETCH_PER_ATTEMPT_TIMEOUT_MS;
  const sleep = options.sleep ?? sleepMs;

  const deadline = Date.now() + totalBudgetMs;
  let lastResponse: Response | undefined;
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const timeoutMs = Math.min(perAttemptTimeoutMs, remaining);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        headers: {
          'X-Api-Key': apiKey,
          Accept: 'application/json',
          'User-Agent': 'LeaseUp/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      lastResponse = response;
      if (isRetryableQlooStatus(response.status) && attempt < maxRetries) {
        await sleep(jitteredBackoffMs(attempt));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastNetworkError = err;
      const aborted = (err as Error).name === 'AbortError';
      if (attempt < maxRetries && Date.now() < deadline) {
        await sleep(jitteredBackoffMs(attempt));
        continue;
      }
      if (aborted) {
        throw qlooUnavailableError('Qloo API timeout');
      }
      throw qlooUnavailableError('Qloo API fetch error');
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  if (lastNetworkError) {
    throw qlooUnavailableError('Qloo API fetch error');
  }
  throw qlooUnavailableError('Qloo API time budget exceeded');
}
