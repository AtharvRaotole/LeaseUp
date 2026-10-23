import type { OwnerUpdateSnapshot } from '@leaseup/contracts';
import { apiUrl } from './api';

export async function fetchOwnerUpdateProperties(): Promise<string[]> {
  const res = await fetch(apiUrl('/api/owner-update/properties'), { credentials: 'include' });
  if (!res.ok) return [];
  const data = (await res.json()) as { properties: string[] };
  return data.properties ?? [];
}

export async function fetchOwnerUpdatePreview(propertyAddress: string): Promise<OwnerUpdateSnapshot> {
  const q = new URLSearchParams({ propertyAddress });
  const res = await fetch(apiUrl(`/api/owner-update/preview?${q}`), { credentials: 'include' });
  if (!res.ok) throw new Error('Preview failed');
  return (await res.json()) as OwnerUpdateSnapshot;
}

export async function shareOwnerUpdate(propertyAddress: string): Promise<{ id: string; snapshot: OwnerUpdateSnapshot }> {
  const res = await fetch(apiUrl('/api/owner-update/share'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyAddress }),
  });
  if (!res.ok) throw new Error('Share failed');
  return (await res.json()) as { id: string; snapshot: OwnerUpdateSnapshot };
}

export async function fetchSharedOwnerUpdate(id: string): Promise<OwnerUpdateSnapshot> {
  const res = await fetch(apiUrl(`/api/owner-update/${id}`));
  if (!res.ok) throw new Error('Not found');
  return (await res.json()) as OwnerUpdateSnapshot;
}
