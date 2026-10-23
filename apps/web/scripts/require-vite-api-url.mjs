/**
 * Production web builds must embed the worker API origin.
 * Local vitest sets VITE_API_URL_ALLOW_MISSING=1; CI sets VITE_API_URL.
 */
if (process.env.VITE_API_URL_ALLOW_MISSING === '1') {
  process.exit(0);
}
const url = (process.env.VITE_API_URL ?? '').trim();
if (!url) {
  console.error(
    'ERROR: VITE_API_URL is required for @leaseup/web production builds (set it in CI and Cloudflare Pages).'
  );
  process.exit(1);
}
