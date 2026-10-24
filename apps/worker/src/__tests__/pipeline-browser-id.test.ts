import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../index';
import {
  BROWSER_ID_HEADER,
  anonymousBrowserIdFromRequest,
} from '../lib/anonymous-browser-id';

const { boards } = vi.hoisted(() => ({ boards: new Map<string, string[]>() }));

vi.mock('../services/pipeline', () => ({
  PipelineService: vi.fn().mockImplementation(() => ({
    getOrCreate: async (ws: string) => ({ workspaceId: ws, cards: boards.get(ws) ?? [] }),
    addCard: async (ws: string, body: { brandName: string }) => {
      const cards = boards.get(ws) ?? [];
      cards.push(body.brandName);
      boards.set(ws, cards);
      return { workspaceId: ws, cards };
    },
  })),
}));

vi.mock('@leaseup/contracts', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    PipelineAddCardSchema: { parse: (v: unknown) => v },
  };
});

const { pipelineRouter } = await import('../routes/pipeline');

const env = { APP_MODE: 'demo' } as Env;
const ID_A = '11111111-2222-4333-8444-555555555555';
const ID_B = '66666666-7777-4888-9999-000000000000';

function idApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.get('/id', async (c) => c.text(await anonymousBrowserIdFromRequest(c)));
  return app;
}

describe('anonymous browser id (cross-site pipeline workspace)', () => {
  beforeEach(() => boards.clear());

  it('cookie-only clients that cannot store the cookie get a new workspace every request', async () => {
    const app = idApp();
    const a = await (await app.fetch(new Request('https://w.dev/id'), env)).text();
    const b = await (await app.fetch(new Request('https://w.dev/id'), env)).text();
    expect(a).not.toBe(b);
  });

  it('uses the browser id header and skips Set-Cookie', async () => {
    const app = idApp();
    const res = await app.fetch(
      new Request('https://w.dev/id', { headers: { [BROWSER_ID_HEADER]: ID_A } }),
      env
    );
    expect(await res.text()).toBe(ID_A);
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('prefers the header over a stale cookie and ignores malformed headers', async () => {
    const app = idApp();
    const withCookie = await app.fetch(
      new Request('https://w.dev/id', {
        headers: { [BROWSER_ID_HEADER]: ID_A, Cookie: `leaseup_pipeline_ws=${ID_B}` },
      }),
      env
    );
    expect(await withCookie.text()).toBe(ID_A);
    const bad = await app.fetch(
      new Request('https://w.dev/id', {
        headers: { [BROWSER_ID_HEADER]: 'not-a-uuid', Cookie: `leaseup_pipeline_ws=${ID_B}` },
      }),
      env
    );
    expect(await bad.text()).toBe(ID_B);
  });

  it('a card added with the header is on the board read back without cookies', async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.route('/api', pipelineRouter);
    const headers = { 'Content-Type': 'application/json', [BROWSER_ID_HEADER]: ID_A };
    const add = await app.fetch(
      new Request('https://w.dev/api/pipeline/cards', {
        method: 'POST',
        headers,
        body: JSON.stringify({ brandName: 'Warby Parker' }),
      }),
      env
    );
    expect(add.status).toBe(201);
    const board = (await (
      await app.fetch(new Request('https://w.dev/api/pipeline', { headers }), env)
    ).json()) as { workspaceId: string; cards: string[] };
    expect(board.workspaceId).toBe(ID_A);
    expect(board.cards).toEqual(['Warby Parker']);
  });
});
