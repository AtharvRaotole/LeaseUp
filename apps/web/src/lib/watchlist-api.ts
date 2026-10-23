import type { AnalysisResponse, WatchSaveResponse, WatchSpaceDetail, WatchlistResponse } from '@leaseup/contracts';
import { apiUrl } from './api';

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch(apiUrl('/api/watchlist'), { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load watchlist');
  return (await res.json()) as WatchlistResponse;
}

export async function fetchWatchDetail(watchId: string): Promise<WatchSpaceDetail> {
  const res = await fetch(apiUrl(`/api/watchlist/${watchId}`), { credentials: 'include' });
  if (!res.ok) throw new Error('Watch not found');
  return (await res.json()) as WatchSpaceDetail;
}

export async function saveWatchSpace(params: {
  address: string;
  radiusKm: number;
  analysis: AnalysisResponse;
}): Promise<WatchSaveResponse> {
  const res = await fetch(apiUrl('/api/watchlist'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Could not save to watchlist');
  return (await res.json()) as WatchSaveResponse;
}

export async function recheckWatchSpace(watchId: string): Promise<WatchSpaceDetail> {
  const res = await fetch(apiUrl(`/api/watchlist/${watchId}/recheck`), {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Recheck failed');
  }
  return (await res.json()) as WatchSpaceDetail;
}
