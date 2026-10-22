import { Hono } from 'hono';
import type { Env } from '../index';
import { AnalysisRequestSchema } from '@leaseup/contracts';
import { AnalysisService } from '../services/analysis';
import { randomUUID } from 'node:crypto';

export const analysisRouter = new Hono<{ Bindings: Env }>();

analysisRouter.post('/analyze', async (c) => {
  const body = await c.req.json();
  const request = AnalysisRequestSchema.parse(body);

  const runId = randomUUID();
  const ipAddress = c.req.header('cf-connecting-ip') || 'unknown';

  const service = new AnalysisService(c.env);
  const result = await service.analyze(request, runId, ipAddress);

  return c.json(result);
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

  const response: any = {
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
