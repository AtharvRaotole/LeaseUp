import { randomUUID } from 'node:crypto';
import type { PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { SHARE_PERSIST_UNAVAILABLE } from '../lib/kv-persistent';
import { getDemoPitchSnapshot } from '../lib/demo-pitch-catalog';
import { buildPitchPackSnapshot } from '../lib/pitch-snapshot';
import { refreshPitchPackNearestStores } from '../lib/snapshot-nearest-refresh';

export const PITCH_READ_UNAVAILABLE = 'Pitch is temporarily unavailable';
export const PITCH_NEAREST_REFRESH_TIMEOUT_MS = 2500;

export class PitchService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.db = env.DB;
    this.env = env;
  }

  async create(input: PitchCreate): Promise<PitchPackSnapshot> {
    const id = randomUUID();
    const snapshot = buildPitchPackSnapshot(id, input, new Date().toISOString());

    try {
      await this.db
        .prepare('INSERT INTO pitch_packs (pitch_id, payload) VALUES (?, ?)')
        .bind(id, JSON.stringify(snapshot))
        .run();
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'pitch_persist_failed',
          message: (err as Error).message,
        })
      );
      throw new Error(SHARE_PERSIST_UNAVAILABLE, { cause: err });
    }

    return snapshot;
  }

  async get(id: string): Promise<PitchPackSnapshot | null> {
    const demo = getDemoPitchSnapshot(id);
    if (demo) {
      return this.withNearestRefresh(demo);
    }

    let row: { payload: string } | null;
    try {
      row = await this.db
        .prepare('SELECT payload FROM pitch_packs WHERE pitch_id = ?')
        .bind(id)
        .first<{ payload: string }>();
    } catch (err) {
      console.warn(
        JSON.stringify({ event: 'pitch_read_failed', message: (err as Error).message })
      );
      throw new Error(PITCH_READ_UNAVAILABLE, { cause: err });
    }
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as PitchPackSnapshot;
    const snapshot = PitchPackSnapshotSchema.parse(parsed);
    return this.withNearestRefresh(snapshot);
  }

  /**
   * Nearest-store reconcile on read is best effort (static assets and the edge cache only,
   * no Qloo or LLM calls). If it throws or runs long, serve the stored snapshot as is.
   */
  private async withNearestRefresh(snapshot: PitchPackSnapshot): Promise<PitchPackSnapshot> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('nearest refresh timed out')),
          PITCH_NEAREST_REFRESH_TIMEOUT_MS
        );
      });
      return await Promise.race([refreshPitchPackNearestStores(this.env, snapshot), timeout]);
    } catch (err) {
      console.warn(
        JSON.stringify({ event: 'pitch_nearest_refresh_failed', message: (err as Error).message })
      );
      return {
        ...snapshot,
        storeDistanceDataAsOf:
          snapshot.storeDistanceDataAsOf ??
          snapshot.osmSnapshotRecordedAt ??
          snapshot.analysisTimestamp,
        storeDistancesSnapshotOnly: true,
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
