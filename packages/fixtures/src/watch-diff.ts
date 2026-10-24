export type WatchBrandRow = {
  entityId: string;
  name: string;
  affinityRank: number;
  nearestExistingStoreKm?: number;
};

export type WatchRunSnapshot = {
  snapshotId: string;
  recordedAt: string;
  runId: string;
  brands: WatchBrandRow[];
};

export type WatchDiffKind = 'first_check' | 'changes' | 'no_changes';

export type WatchDiffResult = {
  kind: WatchDiffKind;
  newlyOpenedStore: WatchBrandRow[];
  newInTop10: WatchBrandRow[];
  droppedFromTop10: WatchBrandRow[];
};

type AnalysisForWatch = {
  timestamp: string;
  runId: string;
  prospects: Array<{
    brand: { entityId: string; name: string; affinityRank: number };
    nearestExistingStoreKm?: number;
  }>;
};

export function buildWatchRunSnapshot(
  analysis: AnalysisForWatch,
  snapshotId: string
): WatchRunSnapshot {
  return {
    snapshotId,
    recordedAt: analysis.timestamp,
    runId: analysis.runId,
    brands: analysis.prospects.slice(0, 10).map((pack) => ({
      entityId: pack.brand.entityId,
      name: pack.brand.name,
      affinityRank: pack.brand.affinityRank,
      nearestExistingStoreKm: pack.nearestExistingStoreKm,
    })),
  };
}

export function diffWatchSnapshots(
  previous: WatchRunSnapshot,
  current: WatchRunSnapshot,
  radiusKm: number
): WatchDiffResult {
  const prevIds = new Set(previous.brands.map((b) => b.entityId));
  const currIds = new Set(current.brands.map((b) => b.entityId));
  const currById = new Map(current.brands.map((b) => [b.entityId, b]));

  const newInTop10 = current.brands.filter((b) => !prevIds.has(b.entityId));
  const droppedFromTop10 = previous.brands.filter((b) => !currIds.has(b.entityId));

  const newlyOpenedStore: WatchBrandRow[] = [];
  for (const prev of previous.brands) {
    const curr = currById.get(prev.entityId);
    if (!curr) continue;
    const hadNoNearby = prev.nearestExistingStoreKm === undefined;
    const hasNearbyNow =
      curr.nearestExistingStoreKm !== undefined && curr.nearestExistingStoreKm <= radiusKm;
    if (hadNoNearby && hasNearbyNow) {
      newlyOpenedStore.push(curr);
    }
  }

  const hasChange =
    newlyOpenedStore.length > 0 || newInTop10.length > 0 || droppedFromTop10.length > 0;

  return {
    kind: hasChange ? 'changes' : 'no_changes',
    newlyOpenedStore,
    newInTop10,
    droppedFromTop10,
  };
}
