import { Hono } from 'hono';
import type { Env } from '../index';
import {
  ProspectingConfirmGeocodeSchema,
  ProspectingCreateSchema,
} from '@leaseup/contracts';
import { ProspectingService } from '../services/prospecting';
import { analyzeStreamErrorPayload } from '../lib/analyze-stream-error';
import { withSubrequestMeter } from '../lib/subrequest-meter';
import { liveOffloadBinding } from '../lib/live-offload-client';

export const prospectingRouter = new Hono<{ Bindings: Env }>();

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

prospectingRouter.post('/prospecting', async (c) => {
  const body = ProspectingCreateSchema.parse(await c.req.json());
  const service = new ProspectingService(c.env);
  const job = await service.create(body);
  return c.json(job, 201);
});

prospectingRouter.get('/prospecting/:id', async (c) => {
  const service = new ProspectingService(c.env);
  const id = c.req.param('id');
  await service.resumeStaleRunning(id);
  const job = await service.get(id);
  if (!job) {
    return c.json({ error: 'Job not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(job);
});

prospectingRouter.post('/prospecting/:id/confirm', async (c) => {
  const body = ProspectingConfirmGeocodeSchema.parse(await c.req.json());
  const service = new ProspectingService(c.env);
  const job = await service.confirmGeocode(c.req.param('id'), body);
  return c.json(job);
});

prospectingRouter.post('/prospecting/:id/run', async (c) => {
  const id = c.req.param('id');
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIP(ip);
  // ctx.exports.LiveOffload is a free loopback service binding to this Worker; each call
  // runs in its own invocation with its own Workers Free subrequest budget.
  const service = new ProspectingService({
    ...c.env,
    LIVE_OFFLOAD: liveOffloadBinding(() => c.executionCtx),
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (event: string, data: unknown) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      /* disconnected */
    }
  };

  const run = async () => {
    try {
      await send('start', { jobId: id });
      const { result: job } = await withSubrequestMeter(() =>
        service.run(id, ipHash, async (snapshot) => {
          await send('step', snapshot);
        })
      );
      await send('complete', job);
    } catch (error) {
      // Same payload as the analyze stream, so the page can tell the daily cap apart.
      await send('error', analyzeStreamErrorPayload(error));
    } finally {
      try {
        await writer.close();
      } catch {
        /* closed */
      }
    }
  };

  if (c.executionCtx) {
    c.executionCtx.waitUntil(run());
  } else {
    void run();
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
