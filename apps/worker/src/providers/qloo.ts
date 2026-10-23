import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';
import {
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
} from '@leaseup/fixtures';
import { ConfigurationError, UpstreamError } from '../lib/errors';
import { sha256Short } from '../lib/cache-key';
import { DemoModeRequiredError } from '../lib/demo-mode';
import {
  applyQlooInsightsLocationParams,
  applyQlooHeatmapLocationParams,
  chunkBrandIds,
  QLOO_MAX_BRANDS_PER_REQUEST,
} from './qloo-location';
import { assertQlooInsightsValid } from './qloo-validate';

export const QLOO_MAX_TAKE = 50;

export function clampQlooTake(take?: number): number {
  const n = take ?? QLOO_MAX_TAKE;
  return Math.min(QLOO_MAX_TAKE, Math.max(1, Math.floor(n)));
}

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

export type QlooLocation =
  | { kind: 'query'; query: string }
  | { kind: 'point'; latitude: number; longitude: number; radiusKm: number };

type RawHeatmapCell = {
  latitude?: number;
  longitude?: number;
  affinity_rank?: number;
  affinity?: number;
  popularity?: number;
  query?: { affinity?: number; affinity_rank?: number; popularity?: number };
  location?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lon?: number;
    geohash?: string;
  };
};

export function normalizeHeatmapCells(raw: RawHeatmapCell[]): QlooHeatmapCell[] {
  const cells: QlooHeatmapCell[] = [];
  for (const cell of raw) {
    const latitude =
      cell.location?.lat ??
      cell.location?.latitude ??
      cell.latitude;
    const longitude =
      cell.location?.lon ??
      cell.location?.longitude ??
      cell.longitude;
    if (latitude === undefined || longitude === undefined) continue;
    const affinity = cell.query?.affinity ?? cell.affinity;
    const affinityRank =
      cell.query?.affinity_rank ?? cell.affinity_rank ?? affinity ?? 0;
    cells.push({
      latitude,
      longitude,
      affinity_rank: affinityRank,
      affinity,
      popularity: cell.query?.popularity ?? cell.popularity,
    });
  }
  return cells;
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

    if (env.APP_MODE === 'live' && !this.apiKey) {
      throw new ConfigurationError(
        'QLOO_API_KEY is required when APP_MODE=live. Set a key or use APP_MODE=demo.'
      );
    }

    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
  }

  async getBrandInsights(params: {
    location: QlooLocation;
    brandIds?: string[];
    tags?: string[];
    take?: number;
    runId?: string;
  }): Promise<QlooInsight[]> {
    if (this.mode === 'demo') {
      if (params.location.kind !== 'query') {
        throw new DemoModeRequiredError();
      }
      return this.getDemoInsights(params.location.query);
    }

    const take = clampQlooTake(params.take);
    const brandIds = params.brandIds ?? [];
    const locationKey = this.locationCacheKey(params.location);
    const brandKey = brandIds.length ? await sha256Short(brandIds.join(',')) : 'all';
    const cacheKey = `insights:${locationKey}:${params.tags?.join(',') || 'all'}:${brandKey}:take=${take}`;

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

    const batches = brandIds.length > 0 ? chunkBrandIds(brandIds) : [[]];
    const merged: QlooInsight[] = [];

    for (const batch of batches) {
      const batchInsights = await this.fetchInsightsBatch({
        location: params.location,
        brandIds: batch,
        tags: params.tags,
        take,
        runId: params.runId,
      });
      merged.push(...batchInsights);
      assertQlooInsightsValid(batchInsights, batch.length > 0 ? batch : undefined);
    }

    if (merged.length > 0) {
      merged.sort(
        (a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0)
      );
    }

    await this.cache.put(cacheKey, JSON.stringify(merged), {
      expirationTtl: 86400,
    });

    return merged;
  }

  private async fetchInsightsBatch(params: {
    location: QlooLocation;
    brandIds: string[];
    tags?: string[];
    take: number;
    runId?: string;
  }): Promise<QlooInsight[]> {
    const url = new URL('/v2/insights', this.baseUrl);
    url.searchParams.set('filter.type', 'urn:entity:brand');
    applyQlooInsightsLocationParams(url, params.location);

    if (params.brandIds.length > 0) {
      url.searchParams.set('filter.results.entities', params.brandIds.join(','));
    }

    if (params.tags && params.tags.length > 0) {
      url.searchParams.set('filter.tags', params.tags.join(','));
    }

    url.searchParams.set('take', params.take.toString());
    url.searchParams.set('feature.explainability', 'true');

    const start = Date.now();
    const response = await this.fetchWithRetry(url.toString());
    const latency = Date.now() - start;

    if (!response.ok) {
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights',
        statusCode: response.status,
        latencyMs: latency,
        cached: false,
      });
      throw this.mapQlooHttpError(response.status, response.statusText);
    }

    const data = (await response.json()) as QlooResponse<QlooInsight>;
    const insights = data.results?.entities || [];

    await recordApiMetric(this.db, {
      runId: params.runId,
      provider: 'qloo',
      endpoint: '/v2/insights',
      statusCode: 200,
      latencyMs: latency,
      cached: false,
    });

    return insights;
  }

  async getHeatmap(params: {
    location: QlooLocation;
    entityId?: string;
    runId?: string;
  }): Promise<QlooHeatmapCell[]> {
    if (this.mode === 'demo') {
      return [];
    }

    const locationKey = this.locationCacheKey(params.location);
    const cacheKey = `heatmap:${locationKey}:${params.entityId || 'all'}`;

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
    applyQlooHeatmapLocationParams(url, params.location);

    if (params.entityId) {
      url.searchParams.set('signal.interests.entities', params.entityId);
    }

    const start = Date.now();
    const response = await this.fetchWithRetry(url.toString());
    const latency = Date.now() - start;

    if (!response.ok) {
      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'qloo',
        endpoint: '/v2/insights/heatmap',
        statusCode: response.status,
        latencyMs: latency,
        cached: false,
      });
      throw this.mapQlooHttpError(response.status, response.statusText, 'heatmap');
    }

    const data = (await response.json()) as QlooResponse<RawHeatmapCell>;
    const cells = normalizeHeatmapCells(data.results?.heatmap || []);

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

  /** Fallback when heatmap is empty or errors: sample affinity on a lat/lng grid. */
  async getAffinityGrid(params: {
    location: QlooLocation;
    entityId: string;
    gridSize: number;
    runId?: string;
  }): Promise<QlooHeatmapCell[]> {
    if (this.mode === 'demo') {
      return [];
    }

    const size = Math.min(8, Math.max(3, params.gridSize));
    if (params.location.kind !== 'point') {
      // No coordinates to build a grid around; never default to another metro.
      return [];
    }
    const center = params.location;

    const latSpan = (center.radiusKm / 111) * 0.85;
    const lonSpan =
      (center.radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180))) * 0.85;

    const cells: QlooHeatmapCell[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const tLat = size === 1 ? 0.5 : row / (size - 1);
        const tLon = size === 1 ? 0.5 : col / (size - 1);
        const latitude = center.latitude + (tLat - 0.5) * 2 * latSpan;
        const longitude = center.longitude + (tLon - 0.5) * 2 * lonSpan;

        const insights = await this.getBrandInsights({
          location: {
            kind: 'point',
            latitude,
            longitude,
            radiusKm: 2,
          },
          brandIds: [params.entityId],
          take: 1,
          runId: params.runId,
        });

        const hit = insights.find((i) => i.entity_id === params.entityId) ?? insights[0];
        if (!hit) continue;
        const affinity = hit.query?.affinity ?? 0;
        cells.push({
          latitude,
          longitude,
          affinity_rank: hit.query?.affinity_rank ?? affinity,
          affinity,
        });
      }
    }

    return cells;
  }

  private locationCacheKey(location: QlooLocation): string {
    if (location.kind === 'point') {
      return `${location.latitude},${location.longitude}:r${location.radiusKm}`;
    }
    return `q:${location.query}`;
  }

  private mapQlooHttpError(statusCode: number, statusText: string, kind = 'insights'): UpstreamError {
    if (statusCode === 401) {
      return new UpstreamError(
        'Upstream auth failed: Qloo API rejected the API key (401). Check QLOO_API_KEY.',
        502
      );
    }
    if (statusCode === 429) {
      return new UpstreamError(
        'Qloo API rate limit exceeded (429). Please try again in a few moments.',
        503
      );
    }
    if (statusCode >= 500) {
      return new UpstreamError(`Qloo API service unavailable (${statusCode}).`, 502);
    }
    return new UpstreamError(`Qloo ${kind} API error (${statusCode}): ${statusText}`, 502);
  }

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.fetch(url);
      if (response.status !== 429) {
        return response;
      }
      lastResponse = response;
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return lastResponse!;
  }

  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      return await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
          'User-Agent': 'LeaseUp/1.0',
        },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new UpstreamError('Qloo API timeout', 502);
      }
      throw new UpstreamError('Qloo API fetch error', 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  private getDemoInsights(fixtureName: string): QlooInsight[] {
    const fixture = this.fixtureForQuery(fixtureName);
    return fixture.insights.map((row) => ({
      entity_id: row.entity_id,
      name: row.name,
      query: {
        affinity: row.affinity,
        affinity_rank: row.affinity_rank ?? row.affinity,
      },
    }));
  }

  private fixtureForQuery(query: string) {
    if (query === wickerparkFixture.location.name) {
      return wickerparkFixture;
    }
    if (query === seviervilleFixture.location.name) {
      return seviervilleFixture;
    }
    if (query === boulderFixture.location.name) {
      return boulderFixture;
    }

    throw new DemoModeRequiredError();
  }
}

export { QLOO_MAX_BRANDS_PER_REQUEST };
