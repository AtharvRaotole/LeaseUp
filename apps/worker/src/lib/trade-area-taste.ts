import type { TradeAreaTasteContext } from '@leaseup/contracts';
import type { QlooLocation } from '../providers/qloo';
import type { QlooClient } from '../providers/qloo';
import { brandExplainabilityForDemo, matchDemoFixtureId, topOverIndexRows } from '@leaseup/fixtures/worker';

export async function loadTradeAreaTasteForProspect(
  qloo: QlooClient,
  location: { latitude: number; longitude: number; address: string },
  brandEntityId: string,
  radiusKm: number,
  runId?: string
): Promise<TradeAreaTasteContext | undefined> {
  const demoId = matchDemoFixtureId(location.address);
  if (demoId) {
    const recorded = brandExplainabilityForDemo(demoId, brandEntityId);
    if (!recorded) return undefined;
    return {
      tags: topOverIndexRows(recorded.tags),
      audiences: topOverIndexRows(recorded.audiences),
    };
  }

  const qlooLocation: QlooLocation = {
    kind: 'point',
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
  };

  const live = await qloo.getTradeAreaTasteContext({
    location: qlooLocation,
    brandEntityId,
    runId,
  });
  if (!live) return undefined;
  return {
    tags: topOverIndexRows(live.tags),
    audiences: topOverIndexRows(live.audiences),
  };
}
