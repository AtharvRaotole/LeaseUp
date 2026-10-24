import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import type { Env } from '../index';

/** Anonymous visitor id for watchlist (httpOnly, no login). */
export const VISITOR_COOKIE = 'leaseup_visitor_id';

function cookieSecure(c: Context<{ Bindings: Env }>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

export async function visitorIdFromRequest(c: Context<{ Bindings: Env }>): Promise<string> {
  const existing = getCookie(c, VISITOR_COOKIE);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const id = randomUUID();
  setCookie(c, VISITOR_COOKIE, id, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}
