import type { Context } from 'hono';
import type { Env } from '../index';

export function corsHeadersForRequest(c: Context<{ Bindings: Env }>): Record<string, string> {
  const origin = c.req.header('Origin') ?? '';
  const allowed =
    c.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:4178',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:4178',
      'http://127.0.0.1:5173',
    ];
  const pick = allowed.includes(origin) ? origin : allowed[0]!;
  return {
    'Access-Control-Allow-Origin': pick,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}
