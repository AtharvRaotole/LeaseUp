const RETRY_DELAY_MS = 1600;

export function isRetryableHttpStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function isNetworkFetchError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes('failed to fetch') ||
      m.includes('networkerror') ||
      m.includes('network request failed') ||
      m.includes('load failed')
    );
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One automatic retry for transient network failures and 502/503/504 responses. */
export async function fetchWithOneRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  hooks?: { onAutoRetry?: () => void }
): Promise<Response> {
  const run = () => fetch(input, init);

  try {
    let response = await run();
    if (isRetryableHttpStatus(response.status)) {
      hooks?.onAutoRetry?.();
      await delay(RETRY_DELAY_MS);
      response = await run();
    }
    return response;
  } catch (err) {
    if (!isNetworkFetchError(err)) throw err;
    hooks?.onAutoRetry?.();
    await delay(RETRY_DELAY_MS);
    return run();
  }
}
