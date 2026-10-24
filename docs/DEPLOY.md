# Production deploy (box → Cloudflare)

**Offline prep only.** Do not hit the live production worker or Pages URL until after **8 PM ET** (daily Cloudflare reset). Do not deploy from this doc until integration CI is green and the release owner approves.

| Ref | SHA | Role |
|-----|-----|------|
| **Production today** | `93f6560` | Last box deploy (`main`) |
| **Integration ship target** | `737f238` or newer on `cursor/leaseup-v1-c429` | Includes OSM retile (#73), watchlist, owner updates, KV/CPU hardening |

Full broker checklist: [`docs/DEPLOY_CHECKLIST_20.md`](./DEPLOY_CHECKLIST_20.md). Root [`DEPLOY.md`](../DEPLOY.md) still documents first-time Cloudflare setup.

---

## D1 migrations (since `93f6560`)

Apply **only** these three files, **in numeric order** (Wrangler runs them in lexical order; keep `0001` → `0003`):

| Order | File | What it adds |
|-------|------|----------------|
| 1 | `apps/worker/migrations/0001_owner_updates.sql` | `owner_updates` + `idx_owner_updates_created` |
| 2 | `apps/worker/migrations/0002_watch_spaces.sql` | `watch_spaces`, workspace index, unique `(workspace_id, address_key, radius_km)` |
| 3 | `apps/worker/migrations/0003_watch_snapshots.sql` | `watch_snapshots` + `idx_watch_snapshots_watch` |

No other migration files exist between `93f6560` and integration head. Existing production tables (`rate_limits`, `pitch_packs`, `pipeline_boards`, `prospecting_jobs`, …) are unchanged.

### Apply on production D1

```bash
cd apps/worker
pnpm wrangler d1 migrations apply leaseup_db_prod --env production --remote
```

Database name must match `[env.production.d1_databases].database_name` in `wrangler.toml` (currently `leaseup_db_prod`).

**Verify:**

```bash
pnpm wrangler d1 execute leaseup_db_prod --env production --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('owner_updates','watch_spaces','watch_snapshots');"
```

Expect **3** rows. Watchlist recheck cooldown uses existing `rate_limits` (no new table).

**Rollback:** migrations are additive (`IF NOT EXISTS`). Redeploy worker `93f6560` if needed; new tables can stay empty.

---

## Worker bindings & `wrangler.toml` (since `93f6560`)

| Binding | Type | Notes |
|---------|------|--------|
| `DB` | D1 | `leaseup_db_prod` in production |
| `CACHE` | KV | Ephemeral; **analyze path uses Workers Cache API**, not KV (see risks) |
| `ASSETS` | static | ATP geotiles + **OSM snapshot** under `public/osm-tiles/` |

**`wrangler.toml` deltas vs `93f6560`:**

- `migrations_dir = "migrations"` on default and `[env.production.d1_databases]`
- `preview_id` on KV namespaces (local/preview parity only; production uses `id`)

No new bindings (no Queues, R2, or extra KV namespaces).

### Secrets & environment variables

**No new required secrets** for this release. Production should already have:

| Name | Required | Purpose |
|------|----------|---------|
| `QLOO_API_KEY` | Live analyze | Qloo insights |
| `QLOO_BASE_URL` | Optional | Default hackathon API |
| `OPENAI_API_KEY` | Optional | Outreach drafts |
| `OPENAI_MODEL` | Optional | Model id |
| `APP_MODE` | Yes | `demo` or `live` (dashboard overrides `[vars]` in toml) |
| `ALLOWED_ORIGINS` | Optional | CORS allowlist |
| `NOMINATIM_CONTACT` | Optional | Geocode User-Agent contact |

**Pages:** `VITE_API_URL` must point at the **production worker** URL at build time.

---

## Build artifacts shipped in this release

### OSM snapshot (fixed decimal-degree tiles)

- Source of truth: `data/osm-snapshot/tiles/` → copied to `apps/worker/public/osm-tiles/` in `pnpm build`.
- Integration head (post #73): **~82 brands**, **~142k** store points, **0** legacy `|lat|>90` scaled rows (`node scripts/qa/check-build-osm-tile-coords.mjs`).
- `OSM_SNAPSHOT_RECORDED_AT` in `apps/worker/src/data/osm-snapshot-meta.ts` matches the retile build (Oct 2026).
- REI SoHo supplement remains on ATP + OSM tiles until Overpass raw includes node 2483671757.

### Verified / absence guard (worker + web)

- Worker `verifyFromOsmSnapshot`: brands with OSM status `missing` / `failed`, **0** tiled points, or incomplete metro coverage → **`unverified (1 source)`** only (never `verified (2 sources)` without usable OSM).
- Web copy: one-source prospects show **“Checked against All The Places”**, not “Verified”.
- Tests: `apps/worker/src/__tests__/osm-snapshot-verify.test.ts`, web `pitch-checked-sources` / `verification-source-help`.

### Strict eval / CPU 1102

- Worker `buildStrictEvalSnapshot` calls `computeStrictEval(..., { monteCarloDraws: 0 })` on non-demo addresses (hypergeometric expectation only).
- Demo chips use precomputed `demoAnalyzeStrictEval` fixtures (no live shuffle).
- Guard test: `apps/worker/src/__tests__/strict-eval-worker-cpu.test.ts`.

---

## KV / CPU risk review (`93f6560`..integration)

| Area | Change | Risk |
|------|--------|------|
| **KV per `/api/analyze`** | Response cache moved to **Cache API**; pitch/owner/share use **D1** for persistence | **Low** — budgets assert **0** KV gets/puts on analyze (see `kv-route-budget.test.ts`) |
| **Monte Carlo strict eval** | `monteCarloDraws: 0` on worker path | **Low** — avoids prior 1102 class on live analyze |
| **OSM verification** | More brands + tiles in `ASSETS`; live mode may read more geohash tiles per verify | **Medium** — more CPU per analyze in `live` + OSM verify; demo uses fixtures and bounded paths |
| **Worker bundle size** | OSM + ATP tiles in asset bundle | **Medium** — dry-run `index.js` ~**2.24 MiB** (limit **2.40 MiB** in `scripts/check-worker-bundle.mjs`); monitor after further OSM expansion |
| **Watchlist recheck** | Full `analyze()` per recheck | **Medium** — same CPU profile as analyze; cooldown via D1 `rate_limits` |

**Regression tests (CI):**

- `apps/worker/src/__tests__/kv-route-budget.test.ts` — per-route KV budgets
- `apps/worker/src/__tests__/kv-analyze-ops.test.ts` — analyze cold/warm KV counts
- `apps/worker/src/__tests__/strict-eval-worker-cpu.test.ts` — no Monte Carlo on worker
- `scripts/check-worker-bundle.mjs` — no eval JSON in bundle, size cap
- `scripts/worker-analyze-smoke.mjs` — 20× local `/api/analyze`, fail on **1102** / CPU limit text
- `scripts/qa/check-build-osm-tile-coords.mjs` — OSM tile degree guard

---

## Lean post-deploy smoke (after 8 PM ET)

Run against **production worker** only after deploy (not before).

1. `GET /api/health` → 200, JSON ok.
2. **Demo analyze:** `POST /api/analyze` with Wicker address (`1560 N Milwaukee Ave, Chicago, IL 60622`, radius 10) → 200, `prospects.length > 0`, no `1102` in body.
3. **Verification copy:** at least one prospect with `verified: "unverified (1 source)"` (e.g. chain without OSM snapshot) → UI shows “Checked against All The Places”, not “Verified”.
4. **Watchlist:** save from report → `GET /api/watchlist` with workspace cookie → 200; recheck once → 200; immediate second recheck → **429** cooldown.
5. **Owner update:** create share link from pipeline → `GET /api/owner-update/:id` → 200.
6. **Pages:** open `/methodology` — headline eval numbers match committed fixtures (P@10 / same-size AUC from `liveQlooLiftAggregates`).

Optional offline before deploy: `pnpm verify:ci` on integration SHA (includes worker smoke + bundle checks).

---

## Deploy commands (summary)

```bash
pnpm install --frozen-lockfile
# D1 migrations (remote) — see above
pnpm build
pnpm --filter @leaseup/worker deploy --env production
# Pages: build web with VITE_API_URL=<prod worker>, deploy dist
```

Do **not** push to `main` or run production deploy from a cloud agent unless explicitly scheduled after 8 PM ET.
