import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QlooClient } from '../providers/qloo';
import type { Env } from '../index';

describe('QlooClient', () => {
  let mockEnv: Env;
  let client: QlooClient;

  beforeEach(() => {
    mockEnv = {
      DB: {} as D1Database,
      CACHE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      } as any,
      APP_MODE: 'demo',
      QLOO_API_KEY: '',
      QLOO_BASE_URL: 'https://hackathon.api.qloo.com',
    };

    client = new QlooClient(mockEnv);
  });

  describe('getBrandInsights', () => {
    it('returns demo insights in demo mode', async () => {
      const insights = await client.getBrandInsights({
        location: 'Wicker Park, Chicago',
        take: 10,
      });

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('entity_id');
      expect(insights[0]).toHaveProperty('name');
      expect(insights[0]).toHaveProperty('query');
    });

    it('returns Sevierville insights for Sevierville location', async () => {
      const insights = await client.getBrandInsights({
        location: 'Sevierville, Tennessee',
        take: 10,
      });

      expect(insights[0]?.name).toBe('Bass Pro Shops');
    });

    it('returns Boulder insights for Boulder location', async () => {
      const insights = await client.getBrandInsights({
        location: 'Boulder, Colorado',
        take: 10,
      });

      expect(insights[0]?.name).toBe('Whole Foods');
    });
  });

  describe('getHeatmap', () => {
    it('returns heatmap cells', async () => {
      const cells = await client.getHeatmap({
        location: 'Wicker Park, Chicago',
      });

      expect(cells).toBeDefined();
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0]).toHaveProperty('latitude');
      expect(cells[0]).toHaveProperty('longitude');
      expect(cells[0]).toHaveProperty('affinity_rank');
    });
  });
});
