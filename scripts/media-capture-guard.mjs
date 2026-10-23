/**
 * Block accidental production / worker traffic during media capture.
 * Set MEDIA_CAPTURE_ALLOW_PROD=1 only after KV budget is available.
 */

const PROD_PAGE_HOSTS = new Set(['leaseup-59m.pages.dev', 'leaseup.app', 'www.leaseup.app']);
const PROD_API_HOST_PATTERNS = [/\.workers\.dev$/i, /leaseup-worker\./i];

export function isProdPageHost(hostname) {
  return PROD_PAGE_HOSTS.has(hostname.toLowerCase());
}

export function isProdApiHost(hostname) {
  const h = hostname.toLowerCase();
  if (isProdPageHost(h)) return true;
  return PROD_API_HOST_PATTERNS.some((re) => re.test(h));
}

export function mediaCaptureAllowsProd() {
  return process.env.MEDIA_CAPTURE_ALLOW_PROD === '1';
}

/** @param {string} pageBase @param {string} [apiBase] */
export function assertLocalMediaCapture(pageBase, apiBase) {
  if (mediaCaptureAllowsProd()) return;

  const pageHost = new URL(pageBase).hostname;
  if (isProdPageHost(pageHost)) {
    console.error(
      `Refusing production page URL ${pageBase}. Use pnpm record:demo:local or pnpm capture:devpost with a local preview URL.`
    );
    console.error('After KV reset, pass MEDIA_CAPTURE_ALLOW_PROD=1 to override.');
    process.exit(1);
  }

  if (!apiBase) return;
  const apiHost = new URL(apiBase).hostname;
  if (isProdApiHost(apiHost)) {
    console.error(
      `Refusing production worker URL ${apiBase}. Point SCREENSHOT_API / PLAYWRIGHT_API_URL at local wrangler dev.`
    );
    console.error('After KV reset, pass MEDIA_CAPTURE_ALLOW_PROD=1 to override.');
    process.exit(1);
  }
}
