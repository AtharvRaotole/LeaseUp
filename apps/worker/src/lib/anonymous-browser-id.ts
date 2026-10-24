import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import type { Env } from '../index';
import { WORKSPACE_COOKIE } from './workspace-cookie';
import { VISITOR_COOKIE } from './visitor-cookie';

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Header the web app sends with a localStorage id. The web app and the worker live on
 * different sites (pages.dev and workers.dev), so the SameSite=Lax cookie below is never
 * stored or sent on those cross-site fetches. Without the header every request got a
 * fresh UUID and the pipeline and watchlist always read back empty.
 */
export const BROWSER_ID_HEADER = 'X-LeaseUp-Browser-Id';

export function browserIdFromHeader(c: Context<{ Bindings: Env }>): string | null {
  const raw = c.req.header(BROWSER_ID_HEADER)?.trim();
  return raw && UUID_RE.test(raw) ? raw : null;
}

function cookieSecure(c: Context<{ Bindings: Env }>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

function cookieOpts(c: Context<{ Bindings: Env }>) {
  return {
    path: '/',
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: 'Lax' as const,
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** One anonymous UUID per browser; mirrored in pipeline and watchlist cookies. */
export async function anonymousBrowserIdFromRequest(
  c: Context<{ Bindings: Env }>
): Promise<string> {
  const fromHeader = browserIdFromHeader(c);
  if (fromHeader) return fromHeader;
  const pipeline = getCookie(c, WORKSPACE_COOKIE);
  const visitor = getCookie(c, VISITOR_COOKIE);
  const existing =
    pipeline && UUID_RE.test(pipeline)
      ? pipeline
      : visitor && UUID_RE.test(visitor)
        ? visitor
        : null;
  if (existing) {
    if (getCookie(c, WORKSPACE_COOKIE) !== existing) {
      setCookie(c, WORKSPACE_COOKIE, existing, cookieOpts(c));
    }
    if (getCookie(c, VISITOR_COOKIE) !== existing) {
      setCookie(c, VISITOR_COOKIE, existing, cookieOpts(c));
    }
    return existing;
  }
  const id = randomUUID();
  setCookie(c, WORKSPACE_COOKIE, id, cookieOpts(c));
  setCookie(c, VISITOR_COOKIE, id, cookieOpts(c));
  return id;
}
