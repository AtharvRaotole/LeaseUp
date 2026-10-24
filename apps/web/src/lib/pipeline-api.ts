import type {
  PipelineAddCard,
  PipelineBoard,
  PipelinePublicBoard,
  PipelineUpdateCard,
} from '@leaseup/contracts';
import { apiUrl } from './api';
import { browserWorkspaceHeaders } from './browser-workspace-id';

async function pipelineFetch(path: string, init?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...browserWorkspaceHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Pipeline request failed (${res.status})`);
  }
  return res;
}

export async function fetchPipelineBoard(): Promise<PipelineBoard> {
  const res = await pipelineFetch('/api/pipeline');
  return (await res.json()) as PipelineBoard;
}

export async function fetchPublicPipeline(shareId: string): Promise<PipelinePublicBoard> {
  const res = await fetch(apiUrl(`/api/pipeline/public/${shareId}`));
  if (!res.ok) throw new Error('Pipeline link not found');
  return (await res.json()) as PipelinePublicBoard;
}

export async function addPipelineCard(input: PipelineAddCard): Promise<PipelineBoard> {
  const res = await pipelineFetch('/api/pipeline/cards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await res.json()) as PipelineBoard;
}

export async function updatePipelineCard(
  cardId: string,
  patch: PipelineUpdateCard
): Promise<PipelineBoard> {
  const res = await pipelineFetch(`/api/pipeline/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return (await res.json()) as PipelineBoard;
}

export async function generatePipelineOutreach(cardId: string): Promise<PipelineBoard> {
  const res = await pipelineFetch(`/api/pipeline/cards/${cardId}/outreach`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return (await res.json()) as PipelineBoard;
}

export function pipelineExportUrl(): string {
  return apiUrl('/api/pipeline/export.csv');
}

export async function attachPipelinePitchLink(input: {
  pitchId: string;
  pitchLink: string;
  propertyAddress: string;
  brandEntityIds: string[];
}): Promise<PipelineBoard> {
  const res = await pipelineFetch('/api/pipeline/attach-pitch', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await res.json()) as PipelineBoard;
}
