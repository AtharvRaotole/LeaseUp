import type { Context } from 'hono';
import type { Env } from '../index';
import { anonymousBrowserIdFromRequest } from './anonymous-browser-id';

/** Anonymous visitor id for watchlist (httpOnly, no login). */
export const VISITOR_COOKIE = 'leaseup_visitor_id';

export async function visitorIdFromRequest(c: Context<{ Bindings: Env }>): Promise<string> {
  return anonymousBrowserIdFromRequest(c);
}
