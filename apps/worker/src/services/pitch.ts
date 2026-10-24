import { randomUUID } from 'node:crypto';
import type { PitchCreate, PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { SHARE_PERSIST_UNAVAILABLE } from '../lib/kv-persistent';
import { getDemoPitchSnapshot } from '../lib/demo-pitch-catalog';
import { buildPitchPackSnapshot } from '../lib/pitch-snapshot';

export class PitchService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
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
    if (demo) return demo;

    const row = await this.db
      .prepare('SELECT payload FROM pitch_packs WHERE pitch_id = ?')
      .bind(id)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as PitchPackSnapshot;
    return PitchPackSnapshotSchema.parse(parsed);
  }
}
