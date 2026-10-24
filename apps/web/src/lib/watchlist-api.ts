import type { AnalysisResponse, WatchSaveResponse, WatchSpaceDetail, WatchlistResponse } from '@leaseup/contracts';
import { apiUrl } from './api';
import { browserWorkspaceHeaders } from './browser-workspace-id';

export class WatchlistApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch(apiUrl('/api/watchlist'), { credentials: 'include', headers: browserWorkspaceHeaders() });
  if (!res.ok) throw new WatchlistApiError('Could not load your watchlist.', res.status);
  return (await res.json()) as WatchlistResponse;
}

export async function fetchWatchDetail(watchId: string): Promise<WatchSpaceDetail> {
  const res = await fetch(apiUrl(`/api/watchlist/${watchId}`), { credentials: 'include', headers: browserWorkspaceHeaders() });
  if (!res.ok) throw new WatchlistApiError('Watch not found', res.status, 'NOT_FOUND');
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
    headers: { 'Content-Type': 'application/json', ...browserWorkspaceHeaders() },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new WatchlistApiError('Could not save to watchlist', res.status);
  return (await res.json()) as WatchSaveResponse;
}

export async function recheckWatchSpace(watchId: string): Promise<WatchSpaceDetail> {
  const res = await fetch(apiUrl(`/api/watchlist/${watchId}/recheck`), {
    method: 'POST',
    credentials: 'include',
    headers: browserWorkspaceHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new WatchlistApiError(
      body.error ?? 'Recheck failed',
      res.status,
      body.code
    );
  }
  return (await res.json()) as WatchSpaceDetail;
}

export async function removeWatchSpace(watchId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/watchlist/${watchId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: browserWorkspaceHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new WatchlistApiError(body.error ?? 'Could not remove', res.status, body.code);
  }
}
