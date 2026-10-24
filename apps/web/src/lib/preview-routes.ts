type PreviewEnv = {
  DEV: boolean;
  VITE_PREVIEW_ROUTES?: string;
};

/** Offline screenshot routes; disabled in production builds unless VITE_PREVIEW_ROUTES is set at build time. */
export function previewRoutesEnabled(env: PreviewEnv = import.meta.env): boolean {
  if (env.DEV) return true;
  const flag = env.VITE_PREVIEW_ROUTES;
  return flag === '1' || flag === 'true';
}
