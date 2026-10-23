import type { GeocodePreviewResponse } from '@leaseup/contracts';
import { apiUrl } from './api';
import { parseApiErrorResponse } from './api-error';

export async function fetchGeocodePreview(address: string): Promise<GeocodePreviewResponse> {
  const response = await fetch(apiUrl('/api/geocode'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) {
    throw await parseApiErrorResponse(response);
  }
  return (await response.json()) as GeocodePreviewResponse;
}
