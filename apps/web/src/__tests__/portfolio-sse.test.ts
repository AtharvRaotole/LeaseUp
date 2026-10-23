import { describe, it, expect } from 'vitest';
import type { PortfolioResponse } from '@leaseup/contracts';
import { applyPortfolioSseMessage, parsePortfolioSseBlock } from '../lib/portfolio-sse';

describe('portfolio SSE', () => {
  it('parses event and data lines', () => {
    const msg = parsePortfolioSseBlock(
      'event: row\ndata: {"id":"r1","inputAddress":"a","status":"analyzing"}\n'
    );
    expect(msg?.event).toBe('row');
    expect(msg?.data).toMatchObject({ id: 'r1', status: 'analyzing' });
  });

  it('applies row updates and complete portfolio payloads', () => {
    const prev: PortfolioResponse = {
      id: 'p1',
      createdAt: '2026-01-01T00:00:00.000Z',
      mode: 'demo',
      rows: [
        { id: 'r1', inputAddress: 'a', status: 'ready' },
        { id: 'r2', inputAddress: 'b', status: 'ready' },
      ],
    };
    const analyzing = applyPortfolioSseMessage(prev, {
      event: 'row',
      data: { id: 'r1', inputAddress: 'a', status: 'analyzing' },
    });
    expect(analyzing?.rows[0]?.status).toBe('analyzing');

    const done = applyPortfolioSseMessage(analyzing, {
      event: 'complete',
      data: {
        ...prev,
        rows: [
          { id: 'r1', inputAddress: 'a', status: 'complete' },
          { id: 'r2', inputAddress: 'b', status: 'complete' },
        ],
      },
    });
    expect(done?.rows.every((r) => r.status === 'complete')).toBe(true);
  });
});
