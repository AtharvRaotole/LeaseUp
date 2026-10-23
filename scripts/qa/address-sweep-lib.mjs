/** Shared sweep heuristics (offline-safe; no network). */

export const DELEGATED_ISSUE_PREFIXES = ['verified_absent', 'suspicious_category_world_market'];

export function isDelegatedIssue(flag) {
  return DELEGATED_ISSUE_PREFIXES.some((p) => flag.startsWith(p) || flag === p);
}

export function criticalIssues(issues) {
  return issues.filter((x) => !isDelegatedIssue(x));
}

export function analyzePayload(body, radiusKm = 10) {
  const issues = [];
  if (!body || typeof body !== 'object') {
    issues.push('non_object_body');
    return issues;
  }
  const loc = body.location;
  if (loc) {
    const label = [loc.neighborhood, loc.city, loc.resolvedAddress, loc.address]
      .filter(Boolean)
      .join(' | ');
    if (label.includes(';')) issues.push('semicolon_in_label');
    if (!loc.latitude || !loc.longitude) issues.push('missing_coords');
  }
  const prospects = body.prospects ?? [];
  if (prospects.length === 0) issues.push('empty_prospects');
  const brandIds = prospects.map((p) => p.brand?.entityId).filter(Boolean);
  if (new Set(brandIds).size !== brandIds.length) issues.push('duplicate_brand_ids');
  for (const p of prospects) {
    const v = p.brand?.verified;
    if (v === 'verified absent' && !p.coverageNote?.toLowerCase().includes('osm')) {
      issues.push('verified_absent_single_source?');
    }
    const name = (p.brand?.name || '').toLowerCase();
    if (name.includes('cost plus world market') || name.includes('world market')) {
      issues.push('suspicious_category_world_market');
    }
    const s = JSON.stringify(p);
    if (s.includes('NaN') || s.includes('undefined')) issues.push('nan_or_undefined_in_prospect');
  }
  const rankings = body.rankings ?? [];
  if (rankings.length === 0 && (body.prospects?.length ?? 0) > 0) issues.push('empty_rankings');
  const raw = JSON.stringify(body);
  if (raw.includes('NaN') || raw.includes('"undefined"')) issues.push('nan_in_payload');
  return [...new Set(issues)];
}

/** Removed from sweep heuristics; strip when re-scoring saved reports. */
const LEGACY_ISSUE_FLAGS = new Set(['store_beyond_radius']);

export function normalizeStoredIssues(issues) {
  return (issues ?? []).filter((x) => !LEGACY_ISSUE_FLAGS.has(x));
}

export function rowPass(geo, analysis) {
  const issues = normalizeStoredIssues(analysis.issues);
  const analyzeOk = analysis.status === 200 && criticalIssues(issues).length === 0;
  const gracefulGeocodeFail =
    geo.status !== 200 &&
    (geo.code === 'GEOCODE_NOT_FOUND' || geo.status === 404) &&
    analysis.status === 404 &&
    analysis.code === 'GEOCODE_NOT_FOUND';
  return analyzeOk || (gracefulGeocodeFail && criticalIssues(issues).length === 0);
}
