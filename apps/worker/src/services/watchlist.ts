import { randomUUID } from 'node:crypto';
import type {
  AnalysisResponse,
  WatchDiffResult,
  WatchSpaceDetail,
  WatchSpaceSummary,
  WatchRunSnapshot,
} from '@leaseup/contracts';
import {
  WatchRunSnapshotSchema,
  WatchSpaceDetailSchema,
  WatchSpaceSummarySchema,
} from '@leaseup/contracts';
import { buildWatchRunSnapshot, diffWatchSnapshots } from '@leaseup/fixtures';
import { normalizeAddress } from '@leaseup/fixtures/worker';
import type { Env } from '../index';
import { assertRecheckAllowed, markRecheckCompleted } from '../lib/watch-recheck-cooldown';

function addressKey(address: string): string {
  return normalizeAddress(address);
}

function rowToSummary(row: {
  watch_id: string;
  address: string;
  radius_km: number;
  created_at: number;
  updated_at: number;
  snapshot_count: number;
}): WatchSpaceSummary {
  return WatchSpaceSummarySchema.parse({
    watchId: row.watch_id,
    address: row.address,
    radiusKm: row.radius_km,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    lastCheckedAt: new Date(row.updated_at * 1000).toISOString(),
    snapshotCount: row.snapshot_count,
  });
}

export class WatchlistService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async list(workspaceId: string): Promise<WatchSpaceSummary[]> {
    const result = await this.db
      .prepare(
        `SELECT w.watch_id, w.address, w.radius_km, w.created_at, w.updated_at,
          (SELECT COUNT(*) FROM watch_snapshots s WHERE s.watch_id = w.watch_id) AS snapshot_count
         FROM watch_spaces w
         WHERE w.workspace_id = ?
         ORDER BY w.updated_at DESC`
      )
      .bind(workspaceId)
      .all<{
        watch_id: string;
        address: string;
        radius_km: number;
        created_at: number;
        updated_at: number;
        snapshot_count: number;
      }>();
    return (result.results ?? []).map(rowToSummary);
  }

  async getDetail(watchId: string, workspaceId: string): Promise<WatchSpaceDetail | null> {
    const space = await this.db
      .prepare(
        `SELECT watch_id, address, radius_km, created_at, updated_at
         FROM watch_spaces WHERE watch_id = ? AND workspace_id = ?`
      )
      .bind(watchId, workspaceId)
      .first<{
        watch_id: string;
        address: string;
        radius_km: number;
        created_at: number;
        updated_at: number;
      }>();
    if (!space) return null;

    const snapshots = await this.loadLatestSnapshots(watchId, 2);
    if (snapshots.length === 0) return null;

    const countRow = await this.db
      .prepare('SELECT COUNT(*) AS c FROM watch_snapshots WHERE watch_id = ?')
      .bind(watchId)
      .first<{ c: number }>();
    const snapshotCount = countRow?.c ?? snapshots.length;

    const summary = rowToSummary({
      ...space,
      snapshot_count: snapshotCount,
    });

    const latest = snapshots[0]!;
    let diff: WatchDiffResult | undefined;
    if (snapshots.length >= 2) {
      diff = diffWatchSnapshots(snapshots[1]!, latest, space.radius_km);
    } else {
      diff = {
        kind: 'first_check',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [],
      };
    }

    return WatchSpaceDetailSchema.parse({
      ...summary,
      latestSnapshot: latest,
      diff,
    });
  }

  async saveFromReport(
    workspaceId: string,
    address: string,
    radiusKm: number,
    analysis: AnalysisResponse
  ): Promise<WatchSpaceDetail> {
    const key = addressKey(address);
    const existing = await this.db
      .prepare(
        `SELECT watch_id FROM watch_spaces
         WHERE workspace_id = ? AND address_key = ? AND radius_km = ?`
      )
      .bind(workspaceId, key, radiusKm)
      .first<{ watch_id: string }>();

    if (existing) {
      const detail = await this.getDetail(existing.watch_id, workspaceId);
      if (detail) return detail;
    }

    const watchId = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare(
        `INSERT INTO watch_spaces (watch_id, workspace_id, address, address_key, radius_km, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(watchId, workspaceId, address.trim(), key, radiusKm, now, now)
      .run();

    const snapshot = await this.insertSnapshot(watchId, analysis);
    await this.touchWatch(watchId, now);

    const summary = WatchSpaceSummarySchema.parse({
      watchId,
      address: address.trim(),
      radiusKm,
      createdAt: new Date(now * 1000).toISOString(),
      lastCheckedAt: new Date(now * 1000).toISOString(),
      snapshotCount: 1,
    });

    return WatchSpaceDetailSchema.parse({
      ...summary,
      latestSnapshot: snapshot,
      diff: {
        kind: 'first_check',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [],
      },
    });
  }

  async assertRecheckAllowedForWatchAsync(
    watchId: string,
    workspaceId: string
  ): Promise<{ address: string; radiusKm: number } | null> {
    const space = await this.getWatchRow(watchId, workspaceId);
    if (!space) return null;
    const now = Math.floor(Date.now() / 1000);
    await assertRecheckAllowed(this.db, watchId, now);
    return { address: space.address, radiusKm: space.radius_km };
  }

  async recheck(
    watchId: string,
    workspaceId: string,
    analysis: AnalysisResponse
  ): Promise<WatchSpaceDetail | null> {
    const space = await this.getWatchRow(watchId, workspaceId);
    if (!space) return null;

    const now = Math.floor(Date.now() / 1000);

    const prior = await this.loadLatestSnapshots(watchId, 1);
    const snapshot = await this.insertSnapshot(watchId, analysis);
    await markRecheckCompleted(this.db, watchId, now);
    await this.touchWatch(watchId, now);

    const countRow = await this.db
      .prepare('SELECT COUNT(*) AS c FROM watch_snapshots WHERE watch_id = ?')
      .bind(watchId)
      .first<{ c: number }>();

    const summary = rowToSummary({
      ...space,
      updated_at: now,
      snapshot_count: countRow?.c ?? prior.length + 1,
    });

    let diff: WatchDiffResult;
    if (prior.length === 0) {
      diff = {
        kind: 'first_check',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [],
      };
    } else {
      diff = diffWatchSnapshots(prior[0]!, snapshot, space.radius_km);
    }

    return WatchSpaceDetailSchema.parse({
      ...summary,
      latestSnapshot: snapshot,
      diff,
    });
  }

  private async insertSnapshot(watchId: string, analysis: AnalysisResponse): Promise<WatchRunSnapshot> {
    const snapshotId = randomUUID();
    const snapshot = buildWatchRunSnapshot(analysis, snapshotId);
    WatchRunSnapshotSchema.parse(snapshot);
    await this.db
      .prepare('INSERT INTO watch_snapshots (snapshot_id, watch_id, payload) VALUES (?, ?, ?)')
      .bind(snapshotId, watchId, JSON.stringify(snapshot))
      .run();
    return snapshot;
  }

  private async touchWatch(watchId: string, unix: number): Promise<void> {
    await this.db
      .prepare('UPDATE watch_spaces SET updated_at = ? WHERE watch_id = ?')
      .bind(unix, watchId)
      .run();
  }

  private async getWatchRow(
    watchId: string,
    workspaceId: string
  ): Promise<{
    watch_id: string;
    address: string;
    radius_km: number;
    created_at: number;
    updated_at: number;
  } | null> {
    return this.db
      .prepare(
        `SELECT watch_id, address, radius_km, created_at, updated_at
         FROM watch_spaces WHERE watch_id = ? AND workspace_id = ?`
      )
      .bind(watchId, workspaceId)
      .first();
  }

  private async loadLatestSnapshots(watchId: string, limit: number): Promise<WatchRunSnapshot[]> {
    const result = await this.db
      .prepare(
        `SELECT payload FROM watch_snapshots
         WHERE watch_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(watchId, limit)
      .all<{ payload: string }>();
    const rows = result.results ?? [];
    return rows.map((row) => WatchRunSnapshotSchema.parse(JSON.parse(row.payload)));
  }
}
