import type { PortfolioResponse, PortfolioRow } from '@leaseup/contracts';

export type PortfolioSseMessage = {
  event: string;
  data: unknown;
};

export function parsePortfolioSseBlock(block: string): PortfolioSseMessage | null {
  const lines = block.split('\n').map((l) => l.trimEnd());
  let event = 'message';
  let dataLine = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    return { event, data: JSON.parse(dataLine) as unknown };
  } catch {
    return null;
  }
}

export function applyPortfolioSseMessage(
  prev: PortfolioResponse | null,
  message: PortfolioSseMessage
): PortfolioResponse | null {
  const { event, data } = message;
  if (event === 'complete' || (data && typeof data === 'object' && 'rows' in data)) {
    return data as PortfolioResponse;
  }
  if (
    (event === 'row' || event === 'message') &&
    data &&
    typeof data === 'object' &&
    'id' in data &&
    'inputAddress' in data
  ) {
    const row = data as PortfolioRow;
    if (!prev) return prev;
    return {
      ...prev,
      rows: prev.rows.map((r) => (r.id === row.id ? row : r)),
    };
  }
  return prev;
}
