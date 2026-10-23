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

analysisRouter.post('/outreach', async (c) => {
  const body = await c.req.json();
  const request = OutreachRequestSchema.parse(body);

  const service = new AnalysisService(c.env);
  const draft = await service.generateOutreachForBrand(
    request.brandName,
    request.address,
    request.reasons,
    request.runId || 'outreach'
  );

  return c.json({ draft });
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
