import { randomUUID } from 'node:crypto';
import type { PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { displayBrandName } from '../lib/brand-display';
import { formatFitsStorefront } from '../lib/storefront-format';

function buildWhyLine(
  prospect: PitchCreate['results']['prospects'][0],
  radiusKm: number
): string {
  const informative = prospect.reasons.find(
    (reason) => !isRankOnlyReason(reason) && !isNearestStoreDistanceLine(reason)
  );
  if (informative) {
    return informative;
  }

  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  if (prospect.nearestExistingStoreKm === undefined) {
    return `No ${name} store within ${radiusKm} km in All The Places and OpenStreetMap checks.`;
  }
  return `Verified absent within ${radiusKm} km (All The Places + OpenStreetMap).`;
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

export class PitchService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async create(input: PitchCreate): Promise<PitchPackSnapshot> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const rankingsTotal = input.results.rankings?.length ?? 0;
    const top = prospectsForPitch(input).slice(0, 5);

    const snapshot: PitchPackSnapshot = {
      id,
      createdAt,
      address: input.results.location.address,
      neighborhood: input.results.location.neighborhood,
      location: input.results.location,
      radiusKm: input.radiusKm,
      analysisTimestamp: input.results.timestamp,
      runId: input.results.runId,
      mode: input.results.mode,
      osmSnapshotLabel: input.results.osmSnapshotLabel,
      osmSnapshotRecordedAt: input.results.osmSnapshotRecordedAt,
      mapImage: input.mapImage,
      prospects: top.map((prospect) => ({
        prospect,
        whyLine: buildWhyLine(prospect, input.radiusKm),
      })),
      rankingsTotal: rankingsTotal || undefined,
      landlord: input.landlord,
      vacancy: input.vacancy,
    };

    PitchPackSnapshotSchema.parse(snapshot);

    await this.db
      .prepare('INSERT INTO pitch_packs (pitch_id, payload) VALUES (?, ?)')
      .bind(id, JSON.stringify(snapshot))
      .run();

    return snapshot;
  }

  async get(id: string): Promise<PitchPackSnapshot | null> {
    const row = await this.db
      .prepare('SELECT payload FROM pitch_packs WHERE pitch_id = ?')
      .bind(id)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as PitchPackSnapshot;
    return PitchPackSnapshotSchema.parse(parsed);
  }
}
