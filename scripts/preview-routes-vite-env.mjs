/** Vite build env for local/CI screenshot and e2e runs that need /__preview/* routes. */
export function viteEnvWithPreviewRoutes(apiUrl) {
  const base = (apiUrl ?? process.env.VITE_API_URL ?? 'https://ci.leaseup.invalid').replace(
    /\/$/,
    ''
  );
  return {
    ...process.env,
    VITE_API_URL: base,
    VITE_PREVIEW_ROUTES: '1',
  };
}
