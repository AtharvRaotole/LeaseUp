import { randomUUID } from 'node:crypto';
import type { PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { displayBrandName } from '../lib/brand-display';

function buildWhyLine(
  prospect: PitchCreate['results']['prospects'][0],
  radiusKm: number
): string {
  if (prospect.reasons[0] && !isRankOnlyReason(prospect.reasons[0])) {
    return prospect.reasons[0];
  }

  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  if (prospect.nearestExistingStoreKm !== undefined) {
    return `Nearest ${name} is ${prospect.nearestExistingStoreKm.toFixed(1)} km from this pin.`;
  }
  return `No ${name} store within ${radiusKm} km in All The Places and OpenStreetMap checks.`;
}

function isRankOnlyReason(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('qloo') && (lower.includes('rank') || lower.includes('top '));
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
    const top = input.results.prospects.slice(0, 5);

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
