/**
 * Anonymous browser id for pipeline, watchlist, and owner update.
 *
 * The web app (pages.dev) and the worker (workers.dev) are different sites, so the
 * worker's SameSite=Lax cookie is never stored or sent on cross-site fetches. The id
 * lives in localStorage instead and rides on every workspace request as a header.
 */
export const BROWSER_WORKSPACE_STORAGE_KEY = 'leaseup-browser-id';
export const BROWSER_WORKSPACE_HEADER = 'X-LeaseUp-Browser-Id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let memoryId: string | null = null;

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function browserWorkspaceId(): string {
  try {
    const stored = localStorage.getItem(BROWSER_WORKSPACE_STORAGE_KEY);
    if (stored && UUID_RE.test(stored)) return stored;
    const id = memoryId ?? newId();
    localStorage.setItem(BROWSER_WORKSPACE_STORAGE_KEY, id);
    memoryId = id;
    return id;
  } catch {
    // Private mode without storage: keep one id for this tab session.
    memoryId ??= newId();
    return memoryId;
  }
}

export function browserWorkspaceHeaders(): Record<string, string> {
  return { [BROWSER_WORKSPACE_HEADER]: browserWorkspaceId() };
}
