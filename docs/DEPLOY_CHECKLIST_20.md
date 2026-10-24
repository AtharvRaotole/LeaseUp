# Box deploy checklist #20 (integration → production)

**Baseline:** production `main` at **`93f6560`** (last box).  
**Integration head:** ship from `cursor/leaseup-v1-c429` after CI green (includes broker stack + watchlist hardening).

Tonight’s release adds **owner update shares**, **broker watchlist** (D1 snapshots + manual recheck diff), **Who to contact** (brand reach line), and **Who shops here** (trade-area shoppers card). No new Cloudflare bindings beyond existing `DB` and `CACHE`.

---

## Pre-flight (offline)

- [ ] Confirm integration CI: **Watchlist e2e** (`e2e/watchlist.spec.ts`) and **Wicker broker e2e** (`e2e/wicker-broker-report.spec.ts`) are green.
- [ ] Watchlist **per-visitor scoping** merged: `leaseup_pipeline_ws` httpOnly cookie → `workspace_id` on all `watch_spaces` / `watch_snapshots` reads and writes (`apps/worker/src/lib/workspace-cookie.ts`, `apps/worker/src/routes/watchlist.ts`).
- [ ] Watchlist **recheck cooldown** merged: 1 recheck per watch space per 10 minutes via D1 `rate_limits` key `watch-recheck:{watchId}` (`apps/worker/src/lib/watch-recheck-cooldown.ts`), 429 before `analyze()`.
- [ ] Pages build uses production `VITE_API_URL` pointing at the production worker.
- [ ] Do not flip live Qloo until after deploy window policy (demo fixtures OK on box).

---

## D1 migrations (since `93f6560`)

Apply **in this order** (files under `apps/worker/migrations/`):

| # | File | Tables / indexes |
|---|------|------------------|
| 1 | `0001_owner_updates.sql` | `owner_updates`, `idx_owner_updates_created` |
| 2 | `0002_watch_spaces.sql` | `watch_spaces`, workspace + unique address indexes |
| 3 | `0003_watch_snapshots.sql` | `watch_snapshots`, `idx_watch_snapshots_watch` |
| 4 | `0004_pipeline_cards.sql` | `pipeline_cards`, workspace + status indexes (broker CRM rows) |
| 5 | `0005_pipeline_card_evidence_watch.sql` | evidence snapshot, `watch_id`, `trade_area_alert` on `pipeline_cards` |

**Nothing else** changed in `schema.sql` after `93f6560` besides these blocks (plus `pipeline_cards` in checklist #20 follow-up) (existing tables such as `pipeline_boards`, `pitch_packs`, `rate_limits` were already on production).

### Remote apply (production worker DB)

From repo root, with Wrangler authenticated to the box account:

```bash
cd apps/worker
pnpm wrangler d1 migrations apply leaseup_db_prod --env production --remote
```

If your Cloudflare dashboard names the database **`leaseup-db`** instead of `leaseup_db_prod`, use the name shown in **Workers & Pages → D1**; it must match `database_name` in `wrangler.toml` under `[env.production.d1_databases]`.

**Verify:**

```bash
pnpm wrangler d1 execute leaseup_db_prod --env production --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('owner_updates','watch_spaces','watch_snapshots');"
```

Expect three rows. Watchlist recheck cooldown reuses existing **`rate_limits`** (no new table).

**Local / CI parity:** e2e and dev still apply full `schema.sql` with `wrangler d1 execute leaseup_db --local --file=schema.sql`; migrations are the production incremental path.

---

## Rollback

All migration SQL is **additive** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). There is **no down migration**.

- **Safe rollback of app code:** redeploy the previous worker + Pages artifact from `93f6560`; new tables can remain empty without breaking old routes.
- **Data:** `owner_updates`, `watch_spaces`, and `watch_snapshots` rows written after deploy stay in D1 until manually deleted; old code simply ignores them.
- **Do not** drop new tables during a hot rollback unless you accept losing owner-update links and saved watches.

---

## Worker deploy

Bindings (unchanged):

| Binding | Type | Notes |
|---------|------|--------|
| `DB` | D1 | `leaseup_db_prod` (production env) |
| `CACHE` | KV | Response cache (preview_id set for local dev only) |
| `ASSETS` | static | Geotiles + worker public assets |

**Secrets / vars** (no new keys for this release):

- Existing: `QLOO_API_KEY`, `QLOO_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `APP_MODE`, optional `ALLOWED_ORIGINS`, `NOMINATIM_CONTACT`.
- `[vars] APP_MODE = "demo"` in `wrangler.toml` is overridden in production by dashboard/secret as today.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @leaseup/worker deploy --env production
```

Smoke after deploy:

```bash
curl -sS "https://<worker>/api/health" | jq .
# Demo wicker analyze still works; watchlist POST requires browser cookie (see scoping above).
```

---

## Pages / frontend

```bash
pnpm --filter @leaseup/web build   # VITE_API_URL=<production worker>
# deploy dist per your Pages workflow
```

New UI surfaces: **Watch this space** on report, `/watchlist`, **Who shops here** sidebar card, **How to reach them** under expanded pitch rows, owner-update share route.

---

## Post-deploy checks

- [ ] Open Wicker demo report: **Who shops here** shows audience chips; expand top brand → **How to reach them** / official real-estate link when fixture has reach data.
- [ ] Save watch → watchlist → recheck once; second recheck within 10 minutes returns cooldown (429).
- [ ] Second browser / incognito does not see another visitor’s watchlist.

---

## Reference SHAs (integration)

| Feature | Notes |
|---------|--------|
| Watchlist feature | Merged via PR #67 (`84d444a`) |
| Watchlist CI + scoping + cooldown + KV preview | PR #69 (`acbb6de`) |
| Deploy checklist #20 + Wicker broker e2e | This branch |
