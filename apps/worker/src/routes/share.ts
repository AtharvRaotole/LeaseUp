import { Hono } from 'hono';
import type { Env } from '../index';
import { AnalysisRequestSchema } from '@leaseup/contracts';
import {
  analysisRequestFromSearchParams,
  pitchShareMeta,
  reportShareMetaFromRequest,
} from '../lib/share-preview';
import { OgImageService } from '../services/og-image';
import { PitchService } from '../services/pitch';

export const shareRouter = new Hono<{ Bindings: Env }>();

shareRouter.get('/og/report.png', async (c) => {
  const url = new URL(c.req.url);
  const request = analysisRequestFromSearchParams(url.searchParams);
  AnalysisRequestSchema.parse(request);
  const svc = new OgImageService(c.env);
  const png = await svc.getReportPng(request);
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

shareRouter.get('/og/pitch/:id.png', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Pitch id required', code: 'BAD_REQUEST' }, 400);
  const svc = new OgImageService(c.env);
  const png = await svc.getPitchPng(id);
  if (!png) {
    return c.json({ error: 'Pitch not found', code: 'NOT_FOUND' }, 404);
  }
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

shareRouter.get('/share/report', async (c) => {
  const url = new URL(c.req.url);
  const request = analysisRequestFromSearchParams(url.searchParams);
  AnalysisRequestSchema.parse(request);
  const slug = url.searchParams.get('slug') || 'run';
  const canonicalPath = `/r/${slug}?${url.searchParams.toString()}`;

  const meta = reportShareMetaFromRequest(request, canonicalPath);
  return c.json(meta, 200, {
    'Cache-Control': 'public, max-age=3600',
  });
});

shareRouter.get('/share/pitch/:id', async (c) => {
  const id = c.req.param('id');
  const pitch = new PitchService(c.env);
  const snapshot = await pitch.get(id);
  if (!snapshot) {
    return c.json({ error: 'Pitch not found', code: 'NOT_FOUND' }, 404);
  }
  const meta = pitchShareMeta(snapshot, `/p/${id}`);
  return c.json(meta, 200, {
    'Cache-Control': 'public, max-age=3600',
  });
});
