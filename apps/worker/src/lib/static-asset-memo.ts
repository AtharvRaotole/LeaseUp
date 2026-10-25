/**
 * Memo for static tile JSON served by the ASSETS binding.
 *
 * Tiles ship with the Worker version, so they never change under a running isolate.
 * Keeping them out of the Cache API matters on the Workers Free plan: Cache API calls
 * share the 50 subrequests per invocation with fetch(), and a live prospecting run
 * reads about a dozen tiles twice. Scoped to the ASSETS binding object and bounded,
 * so memory stays small and two asset sources never mix.
 */
const MAX_ENTRIES = 96;

type Scope = { memo: Map<string, unknown>; inflight: Map<string, Promise<unknown | null>> };
const scopes = new WeakMap<object, Scope>();

function scopeFor(assets: object): Scope {
  let scope = scopes.get(assets);
  if (!scope) {
    scope = { memo: new Map(), inflight: new Map() };
    scopes.set(assets, scope);
  }
  return scope;
}

function remember(scope: Scope, key: string, value: unknown): void {
  scope.memo.delete(key);
  scope.memo.set(key, value);
  while (scope.memo.size > MAX_ENTRIES) {
    const oldest = scope.memo.keys().next().value;
    if (oldest === undefined) break;
    scope.memo.delete(oldest);
  }
}

/** Load once per ASSETS binding; concurrent callers share one fetch. Misses are not memoized. */
export async function loadStaticAssetJson<T>(
  assets: object,
  key: string,
  load: () => Promise<T | null>
): Promise<T | null> {
  const scope = scopeFor(assets);
  if (scope.memo.has(key)) {
    const value = scope.memo.get(key) as T;
    remember(scope, key, value);
    return value;
  }
  const pending = scope.inflight.get(key) as Promise<T | null> | undefined;
  if (pending) return pending;
  const promise = load()
    .then((value) => {
      if (value !== null) remember(scope, key, value);
      return value;
    })
    .finally(() => {
      scope.inflight.delete(key);
    });
  scope.inflight.set(key, promise);
  return promise;
}

export function staticAssetMemoSize(assets: object): number {
  return scopes.get(assets)?.memo.size ?? 0;
}
