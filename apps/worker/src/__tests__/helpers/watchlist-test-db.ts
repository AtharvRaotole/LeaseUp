/** In-memory D1 stub for watchlist routes and service tests (no KV). */

const watchStore = new Map<string, Record<string, unknown>>();
const snapshotStore = new Map<string, { payload: string; created_at: number }[]>();
const rateLimitStore = new Map<string, { window_start: number }>();

export function resetWatchlistTestDb(): void {
  watchStore.clear();
  snapshotStore.clear();
  rateLimitStore.clear();
}

export function createWatchlistTestDb(): D1Database {
  return {
    prepare: (sql: string) => {
      const stmt = {
        binds: [] as unknown[],
        bind(...args: unknown[]) {
          this.binds = args;
          return this;
        },
        async run() {
          if (sql.includes('INSERT INTO watch_spaces')) {
            const [watchId, workspaceId, address, addressKey, radiusKm, created, updated] = this
              .binds as [string, string, string, string, number, number, number];
            watchStore.set(watchId, {
              watch_id: watchId,
              workspace_id: workspaceId,
              address,
              address_key: addressKey,
              radius_km: radiusKm,
              created_at: created,
              updated_at: updated,
            });
          }
          if (sql.includes('INSERT INTO watch_snapshots')) {
            const [, watchId, payload] = this.binds as [string, string, string];
            const list = snapshotStore.get(watchId) ?? [];
            list.push({ payload, created_at: list.length + 1 });
            snapshotStore.set(watchId, list);
          }
          if (sql.includes('UPDATE watch_spaces SET updated_at')) {
            const [updated, watchId] = this.binds as [number, string];
            const row = watchStore.get(watchId);
            if (row) row.updated_at = updated;
          }
          if (sql.includes('DELETE FROM watch_snapshots')) {
            const watchId = String(this.binds[0]);
            snapshotStore.delete(watchId);
          }
          if (sql.includes('DELETE FROM watch_spaces')) {
            const [watchId, workspaceId] = this.binds as [string, string];
            const row = watchStore.get(watchId);
            if (row && row.workspace_id === workspaceId) {
              watchStore.delete(watchId);
            }
          }
          if (sql.includes('UPDATE pipeline_cards')) {
            return { meta: { changes: 0 } };
          }
          if (sql.includes('INSERT INTO rate_limits')) {
            const id = String(this.binds[0]);
            const windowStart = Number(this.binds[1]);
            rateLimitStore.set(id, { window_start: windowStart });
          }
          return {};
        },
        async first() {
          if (sql.includes('SELECT window_start FROM rate_limits')) {
            const row = rateLimitStore.get(String(this.binds[0]));
            return row ? { window_start: row.window_start } : null;
          }
          if (sql.includes('FROM watch_spaces WHERE watch_id = ? AND workspace_id')) {
            const [watchId, workspaceId] = this.binds as [string, string];
            for (const row of watchStore.values()) {
              if (row.watch_id === watchId && row.workspace_id === workspaceId) return row;
            }
            return null;
          }
          if (sql.includes('FROM watch_spaces') && sql.includes('address_key')) {
            const [workspaceId, addressKey, radiusKm] = this.binds as [string, string, number];
            for (const row of watchStore.values()) {
              if (
                row.workspace_id === workspaceId &&
                row.address_key === addressKey &&
                row.radius_km === radiusKm
              ) {
                return { watch_id: row.watch_id };
              }
            }
            return null;
          }
          if (sql.includes('COUNT(*) AS c FROM watch_snapshots')) {
            const watchId = String(this.binds[0]);
            return { c: snapshotStore.get(watchId)?.length ?? 0 };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM watch_spaces w') && sql.includes('workspace_id')) {
            const workspaceId = String(this.binds[0]);
            const rows = [...watchStore.values()].filter((r) => r.workspace_id === workspaceId);
            return {
              results: rows.map((r) => ({
                watch_id: r.watch_id,
                address: r.address,
                radius_km: r.radius_km,
                created_at: r.created_at,
                updated_at: r.updated_at,
                snapshot_count: snapshotStore.get(r.watch_id as string)?.length ?? 0,
              })),
            };
          }
          if (sql.includes('FROM watch_snapshots')) {
            const [watchId, limit] = this.binds as [string, number];
            const list = [...(snapshotStore.get(watchId) ?? [])].sort(
              (a, b) => b.created_at - a.created_at
            );
            return { results: list.slice(0, limit).map((s) => ({ payload: s.payload })) };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}
