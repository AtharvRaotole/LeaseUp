import { randomUUID } from 'node:crypto';
import type { PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { displayBrandName } from '../lib/brand-display';

function tasteFitPhrase(rank: number, total: number): string {
  const pct = total > 0 ? Math.max(1, Math.min(99, Math.round((rank / total) * 100))) : 1;
  return `top ${pct}%`;
}

function buildWhyLine(
  prospect: PitchCreate['results']['prospects'][0],
  rankingsTotal: number
): string {
  const rank = prospect.brand.affinityRank;
  const total = rankingsTotal || rank;
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const fitPhrase = tasteFitPhrase(rank, total);

  if (prospect.reasons[0]) return prospect.reasons[0];

  const verify =
    prospect.brand.verified === 'verified (2 sources)'
      ? 'Verified absent nearby'
      : prospect.brand.verified === 'unverified (1 source)'
        ? 'Only one source checked'
        : 'Checked against store data';

  if (prospect.nearestExistingStoreKm !== undefined) {
    return `${name} ranks ${fitPhrase} for taste (Qloo #${rank}); nearest store ${prospect.nearestExistingStoreKm.toFixed(1)} km away. ${verify}.`;
  }
  return `${name} ranks ${fitPhrase} for taste (Qloo #${rank}); no store in search radius. ${verify}.`;
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
        whyLine: buildWhyLine(prospect, rankingsTotal),
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
