import { Hono } from 'hono';
import type { Env } from '../index';
import { AnalysisRequestSchema, OutreachRequestSchema } from '@leaseup/contracts';
import { AnalysisService } from '../services/analysis';
import { randomUUID } from 'node:crypto';

export const analysisRouter = new Hono<{ Bindings: Env }>();

/**
 * Hash an IP address using SHA-256 (privacy: don't store raw IPs)
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

analysisRouter.post('/analyze', async (c) => {
  const body = await c.req.json();
  const request = AnalysisRequestSchema.parse(body);

  const runId = randomUUID();
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIP(ip);

  const service = new AnalysisService(c.env);
  const result = await service.analyze(request, runId, ipHash);

  return c.json(result);
});

analysisRouter.post('/analyze/stream', async (c) => {
  const body = await c.req.json();
  const request = AnalysisRequestSchema.parse(body);

  const runId = randomUUID();
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIP(ip);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  const service = new AnalysisService(c.env);

  void (async () => {
    try {
      const result = await service.analyzeWithSteps(request, runId, ipHash, async (step) => {
        await send('step', step);
      });
      await send('complete', result);
      const needsOsm = result.prospects.some((p) => p.brand.verified === 'verifying...');
      if (needsOsm) {
        const { prospects: verified, summary } = await service.applyOsmVerification(
          result.location,
          request.radius,
          result.prospects
        );
        await send('verification', { runId, prospects: verified, osmSummary: summary });
      }
    } catch (error) {
      await send('error', { message: (error as Error).message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});

analysisRouter.get('/heatmap', async (c) => {
  const entityId = c.req.query('entityId');
  const lat = c.req.query('lat');
  const lng = c.req.query('lng');
  const radius = c.req.query('radius');
  const address = c.req.query('address') || '';
  if (!entityId || !lat || !lng || !radius) {
    return c.json(
      { error: 'entityId, lat, lng, and radius are required', code: 'VALIDATION_ERROR' },
      400
    );
  }

  const service = new AnalysisService(c.env);
  const data = await service.fetchHeatmapForBrand(
    {
      address,
      latitude: Number(lat),
      longitude: Number(lng),
    },
    Number(radius),
    entityId,
    'heatmap'
  );
  if (data.cells.length === 0) {
    return c.json({ cells: [], available: false });
  }

  return c.json({
    available: true,
    cells: data.cells.map((cell) => ({
      latitude: cell.latitude,
      longitude: cell.longitude,
      affinity: cell.affinity,
      affinityRank: cell.affinity_rank,
    })),
  });
});

analysisRouter.post('/verify', async (c) => {
  const body = await c.req.json();
  const location = body.location as import('@leaseup/contracts').Location;
  const radius = Number(body.radius);
  const prospects = body.prospects as import('@leaseup/contracts').ProspectPack[];
  if (!location || !radius || !Array.isArray(prospects)) {
    return c.json({ error: 'location, radius, and prospects are required', code: 'VALIDATION_ERROR' }, 400);
  }

  const service = new AnalysisService(c.env);
  const { prospects: updated, summary } = await service.applyOsmVerification(
    location,
    radius,
    prospects
  );
  return c.json({ prospects: updated, osmSummary: summary });
});

analysisRouter.post('/outreach', async (c) => {
  const body = await c.req.json();
  const request = OutreachRequestSchema.parse(body);

  const service = new AnalysisService(c.env);
  const { draft, model } = await service.generateOutreachForBrand(
    request.brandName,
    request.address,
    request.reasons,
    request.runId || 'outreach',
    {
      affinityRank: request.affinityRank,
      neighborhood: request.neighborhood,
      nearestStoreKm: request.nearestStoreKm,
    }
  );

  return c.json({ draft, model });
});

analysisRouter.get('/analyze/:runId', async (c) => {
  const runId = c.req.param('runId');
  
  const run = await c.env.DB
    .prepare('SELECT * FROM analysis_runs WHERE run_id = ?')
    .bind(runId)
    .first<{
      run_id: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      status: string;
      result: string | null;
      error: string | null;
      created_at: number;
    }>();

  if (!run) {
    return c.json({ error: 'Run not found', code: 'NOT_FOUND' }, 404);
  }

  const response: Record<string, unknown> = {
    runId: run.run_id,
    address: run.address,
    status: run.status,
    createdAt: new Date(run.created_at * 1000).toISOString(),
  };

  if (run.status === 'completed' && run.result) {
    response.result = JSON.parse(run.result);
  } else if (run.status === 'failed' && run.error) {
    response.error = run.error;
  }

  return c.json(response);
});

analysisRouter.get('/stats', async (c) => {
  const totalRuns = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM analysis_runs')
    .first<{ count: number }>();

  const completedRuns = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM analysis_runs WHERE status = ?')
    .bind('completed')
    .first<{ count: number }>();

  const avgLatency = await c.env.DB
    .prepare('SELECT AVG(latency_ms) as avg FROM api_metrics WHERE provider = ? AND cached = 0')
    .bind('qloo')
    .first<{ avg: number }>();

  const cacheHitRate = await c.env.DB
    .prepare(
      'SELECT ' +
      '  SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as rate ' +
      'FROM api_metrics WHERE provider = ?'
    )
    .bind('qloo')
    .first<{ rate: number }>();

  return c.json({
    totalAnalyses: totalRuns?.count || 0,
    completedAnalyses: completedRuns?.count || 0,
    avgQlooLatency: Math.round(avgLatency?.avg || 0),
    cacheHitRate: Math.round((cacheHitRate?.rate || 0) * 100),
  });
});
