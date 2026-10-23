import { useCallback, useState } from 'react';
import type { ProspectingJob } from '@leaseup/contracts';
import { apiUrl } from '../lib/api';

export function useProspectingRun() {
  const [job, setJob] = useState<ProspectingJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    const res = await fetch(apiUrl(`/api/prospecting/${id}`));
    if (!res.ok) throw new Error('Job not found');
    const data = (await res.json()) as ProspectingJob;
    setJob(data);
    return data;
  }, []);

  const startRun = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/prospecting/${id}/run`), { method: 'POST' });
      if (!res.ok || !res.body) {
        setLoading(false);
        setError('Could not start agent run');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const lines = part.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) data = line.slice(5).trim();
            }
            if (!data) continue;
            const parsed = JSON.parse(data) as ProspectingJob | { message?: string };
            if (event === 'step' || event === 'complete') {
              setJob(parsed as ProspectingJob);
            }
            if (event === 'error') {
              setError((parsed as { message?: string }).message ?? 'Run failed');
            }
          }
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { job, setJob, loading, error, load, startRun };
}
