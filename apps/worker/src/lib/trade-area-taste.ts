import type { TradeAreaTasteContext } from '@leaseup/contracts';
import type { QlooLocation } from '../providers/qloo';
import type { QlooClient } from '../providers/qloo';
import { brandExplainabilityForDemo, matchDemoFixtureId } from '@leaseup/fixtures/worker';
import { isQlooUnavailableError } from './qloo-chain-fallback';

/**
 * Verified brand x local audience overlap for one prospect (demo: live recordings; live: two Qloo
 * calls). Undefined when there is no verified overlap, so the Why card omits the taste section.
 */
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
    if (!recorded || recorded.audiences.length === 0) return undefined;
    return { tags: [], audiences: recorded.audiences };
  }

  const qlooLocation: QlooLocation = {
    kind: 'point',
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
  };

  try {
    const live = await qloo.getTradeAreaTasteContext({
      location: qlooLocation,
      brandEntityId,
      runId,
    });
    if (!live || live.audiences.length === 0) return undefined;
    return { tags: [], audiences: live.audiences };
  } catch (err) {
    if (isQlooUnavailableError(err)) return undefined;
    throw err;
  }
}
