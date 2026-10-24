import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { vi } from 'vitest';

/** D1 stub used by AnalysisService integration tests. */
export function createAnalysisTestDb(run = vi.fn().mockResolvedValue({})): D1Database {
  return {
    prepare: () => {
      const stmt = { bind: () => stmt, run, first: async () => null };
      return stmt;
    },
  } as unknown as D1Database;
}

/** CI does not run worker build; geotiles are gitignored under public/tiles. */
export function ensureWorkerGeotiles(repoRoot: string): void {
  const brandsJson = join(repoRoot, 'apps/worker/public/tiles/brands.json');
  if (existsSync(brandsJson)) return;

  const build = spawnSync(process.execPath, [join(repoRoot, 'scripts/build-geotiles.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (build.status !== 0) {
    throw new Error(
      `build-geotiles failed: ${build.stderr || build.stdout || build.status}`
    );
  }

  const supplements = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts/apply-store-supplements.mjs')],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  if (supplements.status !== 0) {
    throw new Error(
      `apply-store-supplements failed: ${supplements.stderr || supplements.stdout || supplements.status}`
    );
  }
}

export function offlineLiveAnalyzeEnv(
  assets: Fetcher,
  kv: KVNamespace
): import('../../index').Env {
  return {
    DB: createAnalysisTestDb(),
    CACHE: kv,
    APP_MODE: 'live',
    ASSETS: assets,
    QLOO_API_KEY: 'test-key-offline-audit',
    OPENAI_API_KEY: 'test-key-offline-audit',
  } as import('../../index').Env;
}

export function offlineDemoAnalyzeEnv(
  assets: Fetcher,
  kv: KVNamespace
): import('../../index').Env {
  return {
    DB: createAnalysisTestDb(),
    CACHE: kv,
    APP_MODE: 'demo',
    ASSETS: assets,
  } as import('../../index').Env;
}

/** Demo analyze with OSM snapshot tiles (matches wrangler ASSETS binding). */
export function createDemoPublicAssetsFetcher(): Fetcher {
  const publicRoot = join(__dirname, '../../../public');
  return {
    fetch: async (url: string) => {
      if (url.includes('osm.local')) {
        const path = url.replace('https://osm.local', '');
        const file = join(publicRoot, path);
        try {
          return new Response(readFileSync(file), { status: 200 });
        } catch {
          return new Response('missing', { status: 404 });
        }
      }
      if (url.includes('tiles.local')) {
        const path = url.replace('https://tiles.local', '');
        const file = join(publicRoot, path);
        try {
          return new Response(readFileSync(file), { status: 200 });
        } catch {
          return new Response('missing', { status: 404 });
        }
      }
      return new Response('missing', { status: 404 });
    },
  } as unknown as Fetcher;
}

/**
 * ASSETS stub that serves only apps/worker/public/brand-explainability (the live audience recordings
 * the Why card needs) and 404s everything else, so other asset-backed paths behave as with no ASSETS.
 */
export function liveAudiencesOnlyAssets(): Fetcher {
  const publicDir = join(__dirname, '../../../public');
  return {
    fetch: async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path.startsWith('/brand-explainability/')) {
        try {
          return new Response(readFileSync(join(publicDir, path)));
        } catch {
          /* fall through */
        }
      }
      return new Response('not found', { status: 404 });
    },
  } as unknown as Fetcher;
}
