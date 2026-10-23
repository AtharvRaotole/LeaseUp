import type { AnalysisRequest } from '@leaseup/contracts';
import { apiUrl } from './api';

export async function startProspectingJob(input: AnalysisRequest): Promise<string> {
  const res = await fetch(apiUrl('/api/prospecting'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Could not start prospecting job');
  }
  const job = (await res.json()) as { id: string };
  return job.id;
}
