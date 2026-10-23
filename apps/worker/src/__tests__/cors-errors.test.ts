import { describe, it, expect } from 'vitest';
import { ConfigurationError } from '../lib/errors';
import { errorHandler } from '../middleware/error-handler';
import { corsHeadersForRequest } from '../middleware/cors-headers';

function mockContext(origin?: string) {
  return {
    req: { header: (name: string) => (name === 'Origin' ? origin : undefined) },
    json: (body: unknown, status: number, headers?: Record<string, string>) =>
      new Response(JSON.stringify(body), { status, headers }),
    env: {},
  } as never;
}

describe('CORS on error responses', () => {
  it('error handler attaches Access-Control-Allow-Origin', async () => {
    const res = await errorHandler(new ConfigurationError('missing key'), mockContext('http://localhost:4173'));
    expect(res.status).toBe(503);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4173');
  });

  it('corsHeadersForRequest echoes allowed origin', () => {
    const headers = corsHeadersForRequest(mockContext('http://127.0.0.1:4173'));
    expect(headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:4173');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});
