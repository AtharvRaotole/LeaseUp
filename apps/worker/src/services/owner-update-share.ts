import type { OwnerUpdateSnapshot } from '@leaseup/contracts';
import { OwnerUpdateSnapshotSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { SHARE_PERSIST_UNAVAILABLE } from '../lib/kv-persistent';

export class OwnerUpdateShareService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async save(snapshot: OwnerUpdateSnapshot): Promise<OwnerUpdateSnapshot> {
    OwnerUpdateSnapshotSchema.parse(snapshot);

    try {
      await this.db
        .prepare('INSERT INTO owner_updates (update_id, payload) VALUES (?, ?)')
        .bind(snapshot.id, JSON.stringify(snapshot))
        .run();
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'owner_update_persist_failed',
          message: (err as Error).message,
        })
      );
      throw new Error(SHARE_PERSIST_UNAVAILABLE, { cause: err });
    }

    return snapshot;
  }

  async get(id: string): Promise<OwnerUpdateSnapshot | null> {
    const row = await this.db
      .prepare('SELECT payload FROM owner_updates WHERE update_id = ?')
      .bind(id)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as OwnerUpdateSnapshot;
    return OwnerUpdateSnapshotSchema.parse(parsed);
  }
}
