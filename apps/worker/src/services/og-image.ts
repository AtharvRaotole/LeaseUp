import type { AnalysisRequest } from '@leaseup/contracts';
import { AnalysisRequestSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { pitchOgCacheKey, reportOgCacheKey } from '../lib/share-preview';
import { renderPitchSharePng, renderReportSharePng } from '../og/satori-share-card';
import { PitchService } from './pitch';
import { getResponseCache } from '../lib/worker-cache';
import { analysisResponseStubForOg } from '../lib/og-report-stub';

const PNG_TTL_SECONDS = 60 * 60 * 24 * 7;

export class OgImageService {
  constructor(private env: Env) {}

  async getReportPng(request: AnalysisRequest): Promise<Uint8Array> {
    const parsed = AnalysisRequestSchema.parse(request);
    const cacheKey = `og:png:${await reportOgCacheKey(parsed)}`;
    const cache = getResponseCache();
    const hit = await cache.get(cacheKey, 'arrayBuffer');
    if (hit instanceof ArrayBuffer) return new Uint8Array(hit);

    const results = analysisResponseStubForOg(parsed);
    const png = await renderReportSharePng(results, parsed.radius);
    await cache.put(cacheKey, png.slice().buffer, PNG_TTL_SECONDS, 'image/png');
    return png;
  }

  async getPitchPng(pitchId: string): Promise<Uint8Array | null> {
    const cacheKey = `og:png:${pitchOgCacheKey(pitchId)}`;
    const cache = getResponseCache();
    const hit = await cache.get(cacheKey, 'arrayBuffer');
    if (hit instanceof ArrayBuffer) return new Uint8Array(hit);

    const pitch = new PitchService(this.env);
    const snapshot = await pitch.get(pitchId);
    if (!snapshot) return null;

    const png = await renderPitchSharePng(snapshot);
    await cache.put(cacheKey, png.slice().buffer, PNG_TTL_SECONDS, 'image/png');
    return png;
  }
}
