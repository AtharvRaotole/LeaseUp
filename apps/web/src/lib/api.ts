const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}
