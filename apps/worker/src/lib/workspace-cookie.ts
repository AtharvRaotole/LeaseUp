import type { Context } from 'hono';
import type { Env } from '../index';
import { anonymousBrowserIdFromRequest } from './anonymous-browser-id';

/** Anonymous browser workspace (httpOnly cookie, shared by pipeline + watchlist). */
export const WORKSPACE_COOKIE = 'leaseup_pipeline_ws';

export async function workspaceIdFromRequest(c: Context<{ Bindings: Env }>): Promise<string> {
  return anonymousBrowserIdFromRequest(c);
}
