import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import type { Env } from '../index';

/** Anonymous browser workspace (httpOnly cookie, shared by pipeline + watchlist). */
export const WORKSPACE_COOKIE = 'leaseup_pipeline_ws';

function cookieSecure(c: Context<{ Bindings: Env }>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

export async function workspaceIdFromRequest(c: Context<{ Bindings: Env }>): Promise<string> {
  const existing = getCookie(c, WORKSPACE_COOKIE);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const id = randomUUID();
  setCookie(c, WORKSPACE_COOKIE, id, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}
