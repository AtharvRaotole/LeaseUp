import type { TradeAreaShoppersSnapshot } from '@leaseup/contracts';
import {
  matchDemoFixtureId,
  parseQlooTradeAreaTagInsights,
  tradeAreaShopperFixtureForDemo,
} from '@leaseup/fixtures/worker';
import type { QlooClient, QlooLocation } from '../providers/qloo';
import type { ResponseCache } from './response-cache';
import { encodeGeohash } from './geohash';

function toSnapshot(raw: unknown): TradeAreaShoppersSnapshot | undefined {
  const parsed = parseQlooTradeAreaTagInsights(raw);
  if (!parsed) return undefined;
  return { groups: parsed.groups, qlooFields: parsed.qlooFields };
}

function shoppersCacheKey(location: { latitude: number; longitude: number }, radiusKm: number): string {
  const hash = encodeGeohash(location.latitude, location.longitude, 7);
  return `trade-area-shoppers:v2:${hash}:${radiusKm}`;
}

export async function loadTradeAreaShoppersSnapshot(params: {
  qloo: QlooClient;
  responseCache: ResponseCache;
  location: { latitude: number; longitude: number; address: string };
  radiusKm: number;
  runId?: string;
  mode: 'live' | 'demo';
}): Promise<TradeAreaShoppersSnapshot | undefined> {
  const demoId = matchDemoFixtureId(params.location.address);
  if (params.mode === 'demo') {
    if (!demoId) return undefined;
    const fixture = tradeAreaShopperFixtureForDemo(demoId);
    if (!fixture) return undefined;
    return toSnapshot(fixture);
  }

  const cacheKey = shoppersCacheKey(params.location, params.radiusKm);
  const cached = await params.responseCache.get(cacheKey, 'text');
  if (typeof cached === 'string') {
    const snap = toSnapshot(JSON.parse(cached) as unknown);
    if (snap) return snap;
  }

  const qlooLocation: QlooLocation = {
    kind: 'point',
    latitude: params.location.latitude,
    longitude: params.location.longitude,
    radiusKm: params.radiusKm,
  };

  let raw: unknown;
  try {
    raw = await params.qloo.getTradeAreaShopperTagInsights({
      location: qlooLocation,
      runId: params.runId,
    });
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: 'trade_area_shoppers_qloo_failed',
        message: (err as Error).message,
      })
    );
    return undefined;
  }

  if (!raw) return undefined;

  const snap = toSnapshot(raw);
  if (!snap) return undefined;

  await params.responseCache.putTextIfChanged(cacheKey, JSON.stringify(raw), 86400);
  return snap;
}
