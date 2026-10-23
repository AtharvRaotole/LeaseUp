import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';

export interface QlooInsight {
  entity_id: string;
  name: string;
  query?: {
    affinity?: number;
    affinity_rank?: number;
    popularity?: number;
  };
}

export interface QlooHeatmapCell {
  latitude: number;
  longitude: number;
  affinity_rank: number;
  affinity?: number;
  popularity?: number;
}

export interface QlooResponse<T> {
  results: {
    entities?: T[];
    heatmap?: T[];
  };
}

export class QlooClient {
  private baseUrl: string;
  private apiKey: string;
  private cache: KVNamespace;
  private db: D1Database;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.baseUrl = env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
    this.apiKey = env.QLOO_API_KEY || '';
    this.cache = env.CACHE;
    this.db = env.DB;
    this.mode = (env.APP_MODE === 'live' && this.apiKey) ? 'live' : 'demo';
  }

  async getBrandInsights(params: {
    location: string;
    brandIds?: string[];
    tags?: string[];
    take?: number;
    runId?: string;
  }): Promise<QlooInsight[]> {
    if (this.mode === 'demo') {
      return this.getDemoInsights(params.location);
    }

    const cacheKey = `insights:${params.location}:${params.tags?.join(',') || 'all'}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights',
        statusCode: 200,
        latencyMs: 0,
        cached: true,
      });
      return JSON.parse(cached) as QlooInsight[];
    }

    const url = new URL('/v2/insights', this.baseUrl);
    url.searchParams.set('filter.type', 'urn:entity:brand');
    url.searchParams.set('signal.location.query', params.location);
    
    if (params.brandIds && params.brandIds.length > 0) {
      url.searchParams.set('filter.results.entities', params.brandIds.join(','));
    }
    
    if (params.tags && params.tags.length > 0) {
      url.searchParams.set('filter.tags', params.tags.join(','));
    }
    
    url.searchParams.set('take', (params.take || 50).toString());
    url.searchParams.set('feature.explainability', 'true');

    const start = Date.now();
    
    const response = await this.fetch(url.toString());
    const latency = Date.now() - start;
    
    if (!response.ok) {
      const statusCode = response.status;
      const statusText = response.statusText;
      
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights',
        statusCode: response.status,
        latencyMs: latency,
        cached: false,
      });

      // Specific error messages for UI
      if (statusCode === 401) {
        throw new Error('Qloo API authentication failed (401). Check QLOO_API_KEY configuration.');
      } else if (statusCode === 429) {
        throw new Error('Qloo API rate limit exceeded (429). Please try again in a few moments.');
      } else if (statusCode >= 500) {
        throw new Error(`Qloo API service unavailable (${statusCode}). The service may be experiencing issues.`);
      } else {
        throw new Error(`Qloo API error (${statusCode}): ${statusText}`);
      }
    }
    }

    const data = await response.json() as QlooResponse<QlooInsight>;
    const insights = data.results?.entities || [];

    await recordApiMetric(this.db, {
      runId: params.runId,
      provider: 'qloo',
      endpoint: '/v2/insights',
      statusCode: 200,
      latencyMs: latency,
      cached: false,
    });

    await this.cache.put(cacheKey, JSON.stringify(insights), {
      expirationTtl: 86400,
    });

    return insights;
  }

  async getHeatmap(params: {
    location: string;
    entityId?: string;
    runId?: string;
  }): Promise<QlooHeatmapCell[]> {
    if (this.mode === 'demo') {
      return this.getDemoHeatmap(params.location);
    }

    const cacheKey = `heatmap:${params.location}:${params.entityId || 'all'}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights/heatmap',
        statusCode: 200,
        latencyMs: 0,
        cached: true,
      });
      return JSON.parse(cached) as QlooHeatmapCell[];
    }

    const url = new URL('/v2/insights', this.baseUrl);
    url.searchParams.set('filter.type', 'urn:heatmap');
    url.searchParams.set('filter.location.query', params.location);
    
    if (params.entityId) {
      url.searchParams.set('signal.interests.entities', params.entityId);
    }

    const start = Date.now();
    const response = await this.fetch(url.toString());
    const latency = Date.now() - start;
    
    if (!response.ok) {
      const statusCode = response.status;
      const statusText = response.statusText;
      
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights/heatmap',
        statusCode: response.status,
        latencyMs: latency,
        cached: false,
      });

      if (statusCode === 401) {
        throw new Error('Qloo API authentication failed (401). Check QLOO_API_KEY configuration.');
      } else if (statusCode === 429) {
        throw new Error('Qloo API rate limit exceeded (429). Please try again in a few moments.');
      } else if (statusCode >= 500) {
        throw new Error(`Qloo API service unavailable (${statusCode}). The service may be experiencing issues.`);
      } else {
        throw new Error(`Qloo heatmap API error (${statusCode}): ${statusText}`);
      }
    }
    }

    const data = await response.json() as QlooResponse<QlooHeatmapCell>;
    const cells = data.results?.heatmap || [];

    await recordApiMetric(this.db, {
      runId: params.runId,
      provider: 'qloo',
      endpoint: '/v2/insights/heatmap',
      statusCode: 200,
      latencyMs: latency,
      cached: false,
    });

    await this.cache.put(cacheKey, JSON.stringify(cells), {
      expirationTtl: 86400,
    });

    return cells;
  }

  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'LeaseUp/1.0',
        },
        signal: controller.signal,
      });
      
      return response;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('Qloo API timeout', { cause: err });
      }
      throw new Error('Qloo API fetch error', { cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }

  private getDemoInsights(location: string): QlooInsight[] {
    const lowerLocation = location.toLowerCase();
    
    if (lowerLocation.includes('wicker') || lowerLocation.includes('milwaukee ave')) {
      return this.wickerParkInsights();
    } else if (lowerLocation.includes('sevierville') || lowerLocation.includes('collier dr')) {
      return this.seviervilleInsights();
    } else if (lowerLocation.includes('boulder') || lowerLocation.includes('pearl st')) {
      return this.boulderInsights();
    }
    
    return this.wickerParkInsights();
  }

  private getDemoHeatmap(_location: string): QlooHeatmapCell[] {
    return [
      { latitude: 41.9088, longitude: -87.6776, affinity_rank: 0.95, affinity: 0.892 },
      { latitude: 41.9098, longitude: -87.6786, affinity_rank: 0.94, affinity: 0.885 },
      { latitude: 41.9078, longitude: -87.6766, affinity_rank: 0.93, affinity: 0.878 },
    ];
  }

  private wickerParkInsights(): QlooInsight[] {
    return [
      { entity_id: 'urn:qloo:entity:brand:trader_joes', name: 'Trader Joe\'s', query: { affinity: 0.892, affinity_rank: 0.95, popularity: 0.85 } },
      { entity_id: 'urn:qloo:entity:brand:whole_foods', name: 'Whole Foods', query: { affinity: 0.885, affinity_rank: 0.94, popularity: 0.92 } },
      { entity_id: 'urn:qloo:entity:brand:sweetgreen', name: 'Sweetgreen', query: { affinity: 0.878, affinity_rank: 0.93, popularity: 0.78 } },
      { entity_id: 'urn:qloo:entity:brand:lululemon', name: 'Lululemon', query: { affinity: 0.871, affinity_rank: 0.92, popularity: 0.88 } },
      { entity_id: 'urn:qloo:entity:brand:madewell', name: 'Madewell', query: { affinity: 0.865, affinity_rank: 0.91, popularity: 0.71 } },
      { entity_id: 'urn:qloo:entity:brand:everlane', name: 'Everlane', query: { affinity: 0.858, affinity_rank: 0.90, popularity: 0.65 } },
      { entity_id: 'urn:qloo:entity:brand:reformation', name: 'Reformation', query: { affinity: 0.851, affinity_rank: 0.89, popularity: 0.69 } },
      { entity_id: 'urn:qloo:entity:brand:aritzia', name: 'Aritzia', query: { affinity: 0.844, affinity_rank: 0.88, popularity: 0.72 } },
      { entity_id: 'urn:qloo:entity:brand:bluemercury', name: 'Bluemercury', query: { affinity: 0.837, affinity_rank: 0.87, popularity: 0.58 } },
      { entity_id: 'urn:qloo:entity:brand:warby_parker', name: 'Warby Parker', query: { affinity: 0.830, affinity_rank: 0.86, popularity: 0.74 } },
    ];
  }

  private seviervilleInsights(): QlooInsight[] {
    return [
      { entity_id: 'urn:qloo:entity:brand:bass_pro_shops', name: 'Bass Pro Shops', query: { affinity: 0.912, affinity_rank: 0.98, popularity: 0.68 } },
      { entity_id: 'urn:qloo:entity:brand:cracker_barrel', name: 'Cracker Barrel', query: { affinity: 0.905, affinity_rank: 0.97, popularity: 0.82 } },
      { entity_id: 'urn:qloo:entity:brand:hobby_lobby', name: 'Hobby Lobby', query: { affinity: 0.898, affinity_rank: 0.96, popularity: 0.75 } },
      { entity_id: 'urn:qloo:entity:brand:altard_state', name: 'Altar\'d State', query: { affinity: 0.885, affinity_rank: 0.94, popularity: 0.45 } },
      { entity_id: 'urn:qloo:entity:brand:marley_lilly', name: 'Marley Lilly', query: { affinity: 0.878, affinity_rank: 0.93, popularity: 0.38 } },
      { entity_id: 'urn:qloo:entity:brand:old_navy', name: 'Old Navy', query: { affinity: 0.871, affinity_rank: 0.92, popularity: 0.89 } },
      { entity_id: 'urn:qloo:entity:brand:tj_maxx', name: 'TJ Maxx', query: { affinity: 0.864, affinity_rank: 0.91, popularity: 0.91 } },
      { entity_id: 'urn:qloo:entity:brand:academy_sports', name: 'Academy Sports + Outdoors', query: { affinity: 0.857, affinity_rank: 0.90, popularity: 0.65 } },
    ];
  }

  private boulderInsights(): QlooInsight[] {
    return [
      { entity_id: 'urn:qloo:entity:brand:whole_foods', name: 'Whole Foods', query: { affinity: 0.925, affinity_rank: 0.99, popularity: 0.92 } },
      { entity_id: 'urn:qloo:entity:brand:rei', name: 'REI', query: { affinity: 0.918, affinity_rank: 0.98, popularity: 0.81 } },
      { entity_id: 'urn:qloo:entity:brand:lululemon', name: 'Lululemon', query: { affinity: 0.911, affinity_rank: 0.97, popularity: 0.88 } },
      { entity_id: 'urn:qloo:entity:brand:patagonia', name: 'Patagonia', query: { affinity: 0.904, affinity_rank: 0.96, popularity: 0.76 } },
      { entity_id: 'urn:qloo:entity:brand:trader_joes', name: 'Trader Joe\'s', query: { affinity: 0.897, affinity_rank: 0.95, popularity: 0.85 } },
      { entity_id: 'urn:qloo:entity:brand:allbirds', name: 'Allbirds', query: { affinity: 0.890, affinity_rank: 0.94, popularity: 0.58 } },
      { entity_id: 'urn:qloo:entity:brand:alo_yoga', name: 'Alo Yoga', query: { affinity: 0.883, affinity_rank: 0.93, popularity: 0.61 } },
      { entity_id: 'urn:qloo:entity:brand:athleta', name: 'Athleta', query: { affinity: 0.876, affinity_rank: 0.92, popularity: 0.73 } },
      { entity_id: 'urn:qloo:entity:brand:blue_bottle_coffee', name: 'Blue Bottle Coffee', query: { affinity: 0.869, affinity_rank: 0.91, popularity: 0.66 } },
      { entity_id: 'urn:qloo:entity:brand:sweetgreen', name: 'Sweetgreen', query: { affinity: 0.862, affinity_rank: 0.90, popularity: 0.78 } },
    ];
  }
}
