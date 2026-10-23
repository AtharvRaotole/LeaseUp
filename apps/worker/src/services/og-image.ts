import { randomUUID } from 'node:crypto';
import type { AnalysisRequest } from '@leaseup/contracts';
import { AnalysisRequestSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { pitchOgCacheKey, reportOgCacheKey } from '../lib/share-preview';
import { renderPitchSharePng, renderReportSharePng } from '../og/satori-share-card';
import { AnalysisService } from './analysis';
import { PitchService } from './pitch';

const PNG_TTL_SECONDS = 60 * 60 * 24 * 7;

export class OgImageService {
  constructor(private env: Env) {}

  async getReportPng(request: AnalysisRequest): Promise<Uint8Array> {
    const parsed = AnalysisRequestSchema.parse(request);
    const cacheKey = `og:png:${await reportOgCacheKey(parsed)}`;
    const hit = await this.env.CACHE.get(cacheKey, 'arrayBuffer');
    if (hit) return new Uint8Array(hit);

    const analysis = new AnalysisService(this.env);
    const results = await analysis.analyze(parsed, randomUUID(), 'og-image');
    const png = await renderReportSharePng(results, parsed.radius);
    await this.env.CACHE.put(cacheKey, png, { expirationTtl: PNG_TTL_SECONDS });
    return png;
  }

  async getPitchPng(pitchId: string): Promise<Uint8Array | null> {
    const cacheKey = `og:png:${pitchOgCacheKey(pitchId)}`;
    const hit = await this.env.CACHE.get(cacheKey, 'arrayBuffer');
    if (hit) return new Uint8Array(hit);

    const pitch = new PitchService(this.env);
    const snapshot = await pitch.get(pitchId);
    if (!snapshot) return null;

    const png = await renderPitchSharePng(snapshot);
    await this.env.CACHE.put(cacheKey, png, { expirationTtl: PNG_TTL_SECONDS });
    return png;
  }
}
