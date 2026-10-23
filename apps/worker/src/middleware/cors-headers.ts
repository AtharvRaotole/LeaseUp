import type { Context } from 'hono';
import type { Env } from '../index';
import { allowedOrigins } from '../lib/cors-allowed-origins';

export function corsHeadersForRequest(c: Context<{ Bindings: Env }>): Record<string, string> {
  const origin = c.req.header('Origin') ?? '';
  const allowed = allowedOrigins(c.env);
  const pick = allowed.includes(origin) ? origin : allowed[0]!;
  return {
    'Access-Control-Allow-Origin': pick,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}
