import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '../lib/api';

export type HealthResponse = {
  status: string;
  mode: string;
  gitSha?: string;
  buildTime?: string;
};

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/health'));
      if (!res.ok) throw new Error('Health check failed');
      return (await res.json()) as HealthResponse;
    },
    staleTime: 60_000,
  });
}
