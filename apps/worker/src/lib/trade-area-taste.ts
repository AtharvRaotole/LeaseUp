import type { TradeAreaTasteContext } from '@leaseup/contracts';
import type { QlooLocation } from '../providers/qloo';
import type { QlooClient } from '../providers/qloo';
import { BRAND_AUDIENCE_MAX_SHOWN, matchDemoFixtureId } from '@leaseup/fixtures/worker';
import { loadLiveAudiences } from './live-audiences';
import { isQlooUnavailableError } from './qloo-chain-fallback';

export type TradeAreaTasteLookup = {
  taste: TradeAreaTasteContext | undefined;
  /**
   * True when overlap was actually checked (a recorded pair for a demo chip, or a successful live Qloo
   * lookup). False when nothing was recorded or Qloo was unavailable, so "no overlap" is unknown.
   */
  checked: boolean;
};

/**
 * Verified brand x local audience overlap for one prospect (demo: live recordings; live: two Qloo
 * calls). Undefined when there is no verified overlap, so the Why card omits the taste section.
 */
export async function loadTradeAreaTasteForProspect(
  qloo: QlooClient,
  location: { latitude: number; longitude: number; address: string },
  brandEntityId: string,
  radiusKm: number,
  runId?: string,
  assets?: Fetcher
): Promise<TradeAreaTasteContext | undefined> {
  return (await lookupTradeAreaTasteForProspect(qloo, location, brandEntityId, radiusKm, runId, assets)).taste;
}

/** Same lookup, also reporting whether the overlap was checked (the review guardrail needs this). */
export async function lookupTradeAreaTasteForProspect(
  qloo: QlooClient,
  location: { latitude: number; longitude: number; address: string },
  brandEntityId: string,
  radiusKm: number,
  runId?: string,
  assets?: Fetcher
): Promise<TradeAreaTasteLookup> {
  // Recorded brand panel (demo overlap and the live lift baseline); without it there is no Why taste.
  const store = await loadLiveAudiences(assets);
  if (!store) return { taste: undefined, checked: false };
  const demoId = matchDemoFixtureId(location.address);
  if (demoId) {
    const recorded = store.brandExplainabilityForDemo(demoId, brandEntityId, {
      maxAudiences: BRAND_AUDIENCE_MAX_SHOWN,
    });
    if (!recorded) return { taste: undefined, checked: false };
    if (recorded.audiences.length === 0) return { taste: undefined, checked: true };
    return { taste: { tags: [], audiences: recorded.audiences }, checked: true };
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
      panelBaseline: store.audiencePanelBaseline(),
    });
    if (live === null) return { taste: undefined, checked: false };
    if (live.audiences.length === 0) return { taste: undefined, checked: true };
    return { taste: { tags: [], audiences: live.audiences }, checked: true };
  } catch (err) {
    if (isQlooUnavailableError(err)) return { taste: undefined, checked: false };
    throw err;
  }
}
