import type { WatchDiffResult } from '@leaseup/contracts';
import { normalizeAddress } from '@leaseup/fixtures/worker';

function alertForBrand(
  entityId: string,
  diff: WatchDiffResult,
  radiusKm: number
): string | null {
  const opened = diff.newlyOpenedStore.find((b) => b.entityId === entityId);
  if (opened) {
    const km = opened.nearestExistingStoreKm?.toFixed(1) ?? String(radiusKm);
    return `Watch recheck: a store opened about ${km} km away. This pitch may need a fresh look.`;
  }
  const dropped = diff.droppedFromTop10.find((b) => b.entityId === entityId);
  if (dropped) {
    return 'Watch recheck: this brand dropped from your top pitch list. It may no longer be missing from the trade area.';
  }
  return null;
}

/**
 * Flags pipeline cards linked to this watch (same workspace + address). Writes only on recheck.
 */
export async function applyWatchTradeAreaAlerts(
  db: D1Database,
  workspaceId: string,
  watchId: string,
  propertyAddress: string,
  diff: WatchDiffResult,
  radiusKm: number
): Promise<number> {
  if (diff.kind !== 'changes') return 0;

  const entityIds = new Set<string>();
  for (const b of diff.newlyOpenedStore) entityIds.add(b.entityId);
  for (const b of diff.droppedFromTop10) entityIds.add(b.entityId);
  if (entityIds.size === 0) return 0;

  let updated = 0;

  for (const entityId of entityIds) {
    const message = alertForBrand(entityId, diff, radiusKm);
    if (!message) continue;

    const result = await db
      .prepare(
        `UPDATE pipeline_cards SET trade_area_alert = ?, watch_id = COALESCE(watch_id, ?)
         WHERE workspace_id = ? AND brand_entity_id = ?
           AND lower(trim(property_address)) = lower(trim(?))
           AND (watch_id IS NULL OR watch_id = ?)`
      )
      .bind(message, watchId, workspaceId, entityId, propertyAddress.trim(), watchId)
      .run();

    updated += result.meta.changes ?? 0;
  }

  return updated;
}

/** One D1 batch when a watch is created for an address that already has pipeline cards. */
export async function linkPipelineCardsToWatch(
  db: D1Database,
  workspaceId: string,
  watchId: string,
  propertyAddress: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE pipeline_cards SET watch_id = ?
       WHERE workspace_id = ? AND watch_id IS NULL
         AND lower(trim(property_address)) = lower(trim(?))`
    )
    .bind(watchId, workspaceId, propertyAddress.trim())
    .run();
}

export async function findWatchIdForProperty(
  db: D1Database,
  workspaceId: string,
  address: string,
  radiusKm: number
): Promise<string | undefined> {
  const key = normalizeAddress(address);
  const row = await db
    .prepare(
      `SELECT watch_id FROM watch_spaces
       WHERE workspace_id = ? AND address_key = ? AND radius_km = ?`
    )
    .bind(workspaceId, key, radiusKm)
    .first<{ watch_id: string }>();
  return row?.watch_id;
}
