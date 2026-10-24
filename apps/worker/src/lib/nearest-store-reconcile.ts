import type { Location, ProspectPack } from '@leaseup/contracts';
import type { StoreCatalog } from '../services/store-catalog';
import type { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';
import { osmSnapshotBrandUsable } from '../services/osm-snapshot-catalog';
import { NearbyPresenceCache } from './nearby-presence-cache';

const MAX_SCAN_KM = 50;
/** ATP vs OSM farther than this is treated as a material disagreement. */
const MATERIAL_DISAGREEMENT_KM = 2;

export type NearestStoreReconcileResult = {
  km?: number;
  unconfirmed: boolean;
};

export async function reconcileNearestStoreKm(
  entityId: string,
  location: Location,
  catalog: StoreCatalog,
  presence: NearbyPresenceCache,
  osmSnapshot?: OsmSnapshotCatalog
): Promise<NearestStoreReconcileResult> {
  const atpNearby = await presence.storesNearby(entityId, MAX_SCAN_KM);
  const atpKm = atpNearby[0]?.distance;

  let osmKm: number | undefined;
  if (osmSnapshot) {
    const osmNational = await osmSnapshot.getNationalStoreCount(entityId);
    if (osmSnapshotBrandUsable(entityId, osmNational)) {
      osmKm = await osmSnapshot.nearestStoreKm(
        entityId,
        location.latitude,
        location.longitude,
        MAX_SCAN_KM
      );
    }
  }

  if (atpKm === undefined && osmKm === undefined) {
    return { km: undefined, unconfirmed: false };
  }
  if (osmKm === undefined) {
    return { km: atpKm, unconfirmed: false };
  }
  if (atpKm === undefined) {
    return { km: osmKm, unconfirmed: false };
  }

  const nearer = Math.min(atpKm, osmKm);
  const unconfirmed = Math.abs(atpKm - osmKm) >= MATERIAL_DISAGREEMENT_KM;
  return { km: nearer, unconfirmed };
}

const ATP_ABSENCE_REASON_RE = /no .+ store within \d+(?:\.\d+)? km/i;

export function stripFalseAbsenceReasons(
  pack: ProspectPack,
  absenceRadiusKm: number
): ProspectPack {
  const nearest = pack.nearestExistingStoreKm;
  if (
    nearest === undefined ||
    pack.nearestExistingStoreUnconfirmed ||
    nearest > absenceRadiusKm + 0.05
  ) {
    return pack;
  }
  const reasons = pack.reasons.filter((line) => !ATP_ABSENCE_REASON_RE.test(line));
  if (reasons.length === pack.reasons.length) return pack;
  return { ...pack, reasons };
}
