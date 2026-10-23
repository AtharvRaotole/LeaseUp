import type { GeocodePreviewResponse } from '@leaseup/contracts';
import { apiUrl } from './api';
import { apiErrorFromUnknown, parseApiErrorResponse } from './api-error';
import { fetchWithOneRetry, isNetworkFetchError } from './fetch-with-retry';

export async function fetchGeocodePreview(
  address: string,
  hooks?: { onAutoRetry?: () => void }
): Promise<GeocodePreviewResponse> {
  try {
    const response = await fetchWithOneRetry(
      apiUrl('/api/geocode'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      },
      hooks
    );
    if (!response.ok) {
      throw await parseApiErrorResponse(response);
    }
    return (await response.json()) as GeocodePreviewResponse;
  } catch (err) {
    if (isNetworkFetchError(err)) throw apiErrorFromUnknown(err, true);
    throw err;
  }
}
