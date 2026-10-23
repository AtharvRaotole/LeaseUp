import { useQuery } from '@tanstack/react-query';
import type { BrandReverseResponse, MetroOption, TrackedBrand } from '@leaseup/contracts';
import { apiUrl } from '../lib/api';

export function useMetros() {
  return useQuery({
    queryKey: ['metros'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/metros'));
      if (!res.ok) throw new Error('Failed to load metros');
      const data = (await res.json()) as { metros: MetroOption[] };
      return data.metros;
    },
  });
}

export function useBrandSearch(query: string) {
  return useQuery({
    queryKey: ['brands', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(apiUrl(`/api/brands?${params}`));
      if (!res.ok) throw new Error('Failed to load brands');
      const data = (await res.json()) as { brands: TrackedBrand[] };
      return data.brands;
    },
  });
}

export function useBrandReverse(entityId: string | undefined, metroId: string) {
  return useQuery({
    queryKey: ['brand-reverse', entityId, metroId],
    enabled: !!entityId && !!metroId,
    queryFn: async () => {
      const params = new URLSearchParams({ metro: metroId });
      const res = await fetch(apiUrl(`/api/brand/${entityId}/reverse?${params}`));
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Could not load brand heatmap');
      }
      return (await res.json()) as BrandReverseResponse;
    },
  });
}
