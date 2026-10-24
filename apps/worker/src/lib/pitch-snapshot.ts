import type { AnalysisResponse, PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { formatFitsStorefront } from './storefront-format';
import {
  osmSnapshotDisplayLabel,
  osmSnapshotRecordedAt,
} from '../services/osm-snapshot-catalog';

function buildWhyLine(
  prospect: PitchCreate['results']['prospects'][0],
  absenceKm: number
): string {
  const informative = prospect.reasons.find(
    (reason) => !isRankOnlyReason(reason) && !isNearestStoreDistanceLine(reason)
  );
  if (informative) {
    return informative;
  }

  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  if (prospect.nearestExistingStoreKm === undefined) {
    return `No ${name} store within ${absenceKm} km in All The Places and OpenStreetMap checks.`;
  }
  return `Verified absent within ${absenceKm} km (All The Places + OpenStreetMap).`;
}

function isRankOnlyReason(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('qloo') && (lower.includes('rank') || lower.includes('top '));
}

function isNearestStoreDistanceLine(line: string): boolean {
  const trimmed = line.trim();
  if (!/^nearest /i.test(trimmed)) return false;
  return /\d+\.\d+ km/i.test(trimmed);
}

function prospectsForPitch(input: PitchCreate): PitchCreate['results']['prospects'] {
  const sqFt = input.results.storefrontSqFt ?? 2_500;
  return input.results.prospects.filter((prospect) =>
    formatFitsStorefront(prospect.brand.entityId, sqFt)
  );
}

export function buildPitchPackSnapshot(
  id: string,
  input: PitchCreate,
  createdAt = '2026-10-24T00:00:00.000Z'
): PitchPackSnapshot {
  const rankingsTotal = input.results.rankings?.length ?? 0;
  const top = prospectsForPitch(input).slice(0, 5);
  const absenceKm = input.results.prospectFunnel?.absenceRadiusKm ?? input.radiusKm;

  const snapshot: PitchPackSnapshot = {
    id,
    createdAt,
    address: input.results.location.address,
    neighborhood: input.results.location.neighborhood,
    location: input.results.location,
    radiusKm: input.radiusKm,
    absenceRadiusKm: absenceKm,
    analysisTimestamp: input.results.timestamp,
    runId: input.results.runId,
    mode: input.results.mode,
    osmSnapshotLabel: input.results.osmSnapshotLabel,
    osmSnapshotRecordedAt: input.results.osmSnapshotRecordedAt,
    mapImage: input.mapImage,
    prospects: top.map((prospect) => ({
      prospect,
      whyLine: buildWhyLine(prospect, absenceKm),
    })),
    rankingsTotal: rankingsTotal || undefined,
    landlord: input.landlord,
    vacancy: input.vacancy,
  };

  return PitchPackSnapshotSchema.parse(snapshot);
}

const ULTA_ENTITY_ID = '0F77E9A4-121C-4941-ACE1-28502DBF1865';

/** Stable demo pitch: Boulder chip with Ulta Beauty highlighted first. */
export function buildDemoBoulderUltaPitchSnapshot(results: AnalysisResponse): PitchPackSnapshot {
  const input: PitchCreate = { results, radiusKm: 10 };
  const snapshot = buildPitchPackSnapshot('demo-boulder-ulta', input, '2026-10-24T00:00:00.000Z');
  const ultaIndex = snapshot.prospects.findIndex(
    (row) => row.prospect.brand.entityId === ULTA_ENTITY_ID
  );
  if (ultaIndex > 0) {
    const reordered = [...snapshot.prospects];
    const [ultaRow] = reordered.splice(ultaIndex, 1);
    if (ultaRow) {
      reordered.unshift(ultaRow);
      snapshot.prospects = reordered;
    }
  }
  const osmRecorded = osmSnapshotRecordedAt();
  snapshot.analysisTimestamp = osmRecorded;
  snapshot.osmSnapshotRecordedAt = osmRecorded;
  snapshot.osmSnapshotLabel = osmSnapshotDisplayLabel();
  return PitchPackSnapshotSchema.parse(snapshot);
}
