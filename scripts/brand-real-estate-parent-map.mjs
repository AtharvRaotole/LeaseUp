/**
 * Parent-company real-estate portals: a verified URL may only be shared when the
 * brand is explicitly mapped to that parent (avoids e.g. Victoria's Secret on Gap Inc.).
 */
export const PARENT_PORTAL_URLS = {
  'https://www.gapinc.com/en-us/investors/real-estate': [
    'Athleta',
    'Banana Republic',
    'Gap',
    'Old Navy',
  ],
};

export function normalizePortalUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return url;
  }
}

const normalizedPortalEntries = Object.entries(PARENT_PORTAL_URLS).map(([url, brands]) => [
  normalizePortalUrl(url),
  brands,
]);

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertParentPortalAllowed(brandName, url) {
  const key = normalizePortalUrl(url);
  for (const [portalKey, brands] of normalizedPortalEntries) {
    if (portalKey !== key) continue;
    const allowed = new Set(brands.map((b) => b.toLowerCase()));
    if (!allowed.has(brandName.toLowerCase())) {
      return {
        ok: false,
        reason: `${brandName} is not allowed on parent portal ${portalKey} (allowed: ${brands.join(', ')})`,
      };
    }
    return { ok: true };
  }
  return { ok: true };
}

export function collectParentPortalViolations(entries) {
  const violations = [];
  for (const row of entries) {
    if (row.status !== 'verified') continue;
    const result = assertParentPortalAllowed(row.name, row.url);
    if (!result.ok) violations.push(result.reason);
  }
  return violations;
}
