export const THEME_STORAGE_KEY = 'leaseup-theme';

export type AppTheme = 'dark' | 'light';

export function readStoredTheme(): AppTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* private mode */
  }
  return null;
}

/** App default is dark; light only when the user opts in. */
export function resolveAppTheme(): AppTheme {
  return readStoredTheme() ?? 'dark';
}

export function applyAppTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistAppTheme(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  applyAppTheme(theme);
  window.dispatchEvent(new Event('leaseup-theme-change'));
}

export function isAppDark(): boolean {
  if (typeof document === 'undefined') return true;
  const theme = document.documentElement.dataset.theme;
  if (theme === 'light') return false;
  if (theme === 'dark') return true;
  return resolveAppTheme() === 'dark';
}

export function mapBasemapStyleUrl(): string {
  return isAppDark()
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}
